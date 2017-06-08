var extend = require('node.extend');
var log = require("../lib/log");
var debug       = require('debug')('nxhero');
var ArrayHelper = require('arrayhelper-yii2-style');
var LatexTable = require('latex-data-table');


var BaseProcessor = require('../processors/processor');

var sampleProcessor = {
    id: "obra_effort",
    label: "OBRA effort processor",
    binaryTypes: ['sdscip'],
    generatesReports: true,
    lines: [],
    probStats: {},

    /**
     * Hook called before processing individual jobs
     *
     * @param store
     * @param jobs
     * @param options
     * @param callback
     */
    beforeProcessing: function(store, jobs, options, callback) {
        callback(null);
    },

    getJobData: function(job, processorData) {

        let data = {};
        try {
            data.stats = processorData.scip_collector.statistics;
        } catch (e) {
            throw new Error("Unable to get scip stats on job " + job.id);
        }
        data.followupData = processorData.obra_followup_collector || null;
        return data;
    },


    collectParameters: function(job, data, options) {
        let result = {};
        result.addCuts = job.getParameterValueFromJoin('propagating/obra/addCuts', 'string');
        result.addMultiTimeCuts = job.getParameterValueFromJoin('propagating/obra/addMultiTimeCuts', 'string');
        result.propagateAlgebraic = job.getParameterValueFromJoin('propagating/obra/propagateAlgebraic', 'string');
        result.lookback = job.getParameterValueFromJoin('propagating/obra/lookback', 'int');
        return result;
    },


    /** Process a single job
     *
     * @param store
     * @param job
     * @param options
     * @param callback
     */
    processOne : function(store, job, options, callback) {
        var processor = this;
        var processorData = job.processorData;

        /* Get sdscip data */
        let pData = job.processorData;
        let sdData = pData.sdscip_collector;
        let obraData = pData.obra_collector;

        let propVars = sdData.states.n + sdData.algebraic.n;


        /* Get job data */
        let data = this.getJobData(job, processorData);

        /* Collect information of the job */
        let jobParams = this.collectParameters(job, data);
        stateCuts = {
            2: 4,
            3: 12 + 8,
        }
        let line = null;
        let escapedProb = job.problem.name.replace(/_/g, "\\_")
        if (typeof this.probStats[escapedProb] === "undefined") {
            this.probStats[escapedProb] = {};
            let {steps} = sdData;
            let nStates = sdData.states.n;
            line = [
                job.problem.name.replace(/_/g, "\\_"),
                sdData.states.n,
                sdData.algebraic.n,
                sdData.steps,
                propVars * 2,
                stateCuts[sdData.states.n],
                sdData.states.n * 4,
                propVars * 2 * (steps - 1),
                stateCuts[sdData.states.n] * (steps - 1),
                sdData.states.n * 4 * (steps - 1)
            ];
        }
        /* save probstats (actually solved subscips) */
        debug(obraData);

        let key = "nocuts";
        if (jobParams.addCuts === "true")
            key = "cuts"
        else if (jobParams.addMultiTimeCuts === "true")
            key = "multicuts";
        this.probStats[escapedProb][key] = {
            nSolved: obraData.statistics.n_solved,
            jobId: job.id,
        };

        return callback(null, line === null ? null : {line});
    },

    /**
     * Called after processing each job. A good place to process
     * or display results
     * @param store
     * @param jobs
     * @param options
     * @param results
     * @param callback
     */
    afterProcessing: function(store, jobs, options, results, callback) {
        let width = "0.5cm";
        /* Filter results from jobs that had the wrong status */
        results = results.filter(function( element ) {
            return (element !== undefined && element !== null);
        });

        let lines = ArrayHelper.getColumn(results, "line");


        let finalLines = [];
        /* Add comments from this.probStats */
        lines.forEach(line => {
            debug(this.probStats[line[0]])

            finalLines.push({
                comment: JSON.stringify(this.probStats[line[0]]),
                    cells: line

            });
        });


        let headerCells = [
            {
                content: "Instance",
                spec: "l",
                colWidth: 40,
            },
            {
                content: "n",
                spec: "r",
                colWidth: 5,
            },

            {
                content: "n_a",
                spec: "r",
                colWidth: 5,
            },
            {
                content: "time steps",
                spec: "r",
                colWidth: 5,
            },

            {
                content: "state bounds",
                spec: "r",
                formatter: {decimals: 0},
            },
            {
                content: "state cuts",
                spec: "r",
                formatter: {decimals: 0},
                colWidth: 10,
            },
            {
                content: "time cuts",
                spec: "r",
                formatter: {decimals: 0},
            },
            {
                content: "state bounds",
                spec: "r",
                formatter: {decimals: 0},
            },
            {
                content: "state cuts",
                spec: "r",
                formatter: {decimals: 0},
                colWidth: 10,
            },
            {
                content: "time cuts",
                spec: "r",
                formatter: {decimals: 0},
            },
        ];

        let header = {
            comment: "Generated by " + this.id + ", @reportId: " + (this.report ? this.report.id : "no_report" ),
            cells: headerCells,
            latex : `%Generated by ${this.id}, @reportId: ${this.report ? this.report.id : "no_report"}
& & & & \\multicolumn{3}{c}{Per Step}  & \\multicolumn{3}{c}{Total}\\\\            
\\cmidrule(lr){5-7}\\cmidrule(lr){8-10}
Instance    & \\multicolumn{1}{c}{$n$}     & \\multicolumn{1}{c}{$n_a$}  & \\multicolumn{1}{c}{$n_t$}
 & \\multicolumn{1}{c}{$n_{p,b}$}     & \\multicolumn{1}{c}{$n_{p,s}$}  & \\multicolumn{1}{c}{$n_{p,m}$} 
 & \\multicolumn{1}{c}{$n_{p,b}$}     & \\multicolumn{1}{c}{$n_{p,s}$}  & \\multicolumn{1}{c}{$n_{p,m}$} 
\\\\
\\midrule`,
        };

        var options = {
            label: "tab:obra_effort",
            caption: `Number of supbroblems to solve for the basic OBRA algorithm for box bounds ($n_{p,b}$), for cuts in state space ($n_{p,s}$) and for cuts over state variables at two time steps ($n_{p,m}$) for the instances considered in this Section`,
            defaultColWidth: 10,
            noFloat: false,
            escapeCaption: false,
        };

        let latex = LatexTable(finalLines, header, options);
        options.style = "ascii";
        let ascii = LatexTable(finalLines, header, options);
        log.verbose(latex);
        log.verbose("");
        log.verbose("");
        log.info(results);

        if (this.generatesReports) {
            let outfile= this.report.wd + "/effort_table.tex";
            //let outfile = "/home/optimi/bzfvierh/temp/report/effort.tex";
            fs.writeFile(outfile, latex, err => {
                if (err)
                    return callback(err);
                return callback(null);
            });
        } else
            return callback(null);

    },
};

/* Copy BaseProcessor */
var myBaseProcessor = extend(true, {}, BaseProcessor);
sampleProcessor = extend(true, myBaseProcessor, sampleProcessor);

module.exports = sampleProcessor;