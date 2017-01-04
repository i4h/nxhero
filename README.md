# Numerical Experiment Hero

Numerical Experiment Hero is a command line tool 
that lets you set up and launch numerical experiments 
and record them in a relational database.
 
## Installation

````
npm install nxhero
````

To run nxhero you need to configure a database and the root directory
of your runs in the file `config.json` in your nxhero directory.
Your config.json might look like this:
````
{
  "database": {
    "type": "sqlite3",
    "file": "nxhero.sqlite"
  },
  "runs": {
    "rootdir": "~/nxhero_runs",
    "idpadamount" : "3"
  }
````
### Database Configuration
To use an sqlite3 database, simply copy `config_sqlite_template.json`
 to `config.json`.
To use a mysql database, copy `config_mysql_template.json` 
to `config.json` and enter your database details.

Nxhero uses the awesone [OpenRecord](https://github.com/PhilWaldmann/openrecord)
package and eventually hands the database configuration over. 
See the 
[OpenRecord Documenation](https://github.com/PhilWaldmann/openrecord/blob/master/documentation/Home.md)
for more details.

### Run Configuration
You need to set the root directory for your runs in the `config.json`
The directory should exist. 
You can use `~` as an alias for your home directory.

## Running nxhero
Execute the `index.js` to run nxhero.
If you installed nxhero globally (`-g`)
you can start it with the command `nxhero`.

## Workflow

The intended workflow looks something like this:

1) Enter a binary into the database  

2) Enter parameters for the binary  

3) Optional: Enter problems into the database  

4) Create a Jobgroup. A jobgroup contains the following data:    
   - The binary that should be used
   - The set of values for each parameter that should be used
   - The set of problems that should be used
   - The launcher module that should be used
    
5) Launch the jobgroup. This will 
   - Perform the preflight checks for the binary.
   - Save jobgroup data in the database (e.g. version numbers/git hashes)
   - Create a working directory for the group (e.g. `group_001`)
   - For each job:  
     - Create a working directory (e.g. `group_001/job_001`)
     - Prepare the working directory using the job's parameters
       (e.g. write configuration files for the job)  
     - Run the job
     - Save a record of the job in the database  

    
 ## Structure
 
 ### Binaries
 Different types of binaries are represented by 
 modules in the `nxhero/binaries/` directory.
 These modules are responsible for preflight checks,
 preparation of working directories and setting parameters that
 can not be handled by placeholder replacement in the binaries argument
 list.
 To get started creating your own binary, take a look 
 at the documentation in `binaries/default.js`.
 
 
 ### Parameters
 Different types of parameters are represented by 
 modules in the `nxhero/parameters/` directory.
 Distinguishing between parameters allows the binary
 to set them accordingly.
  
### Launchers
  Different ways to launch jobs are represented by 
 modules in the `nxhero/launchers/` directory.
 Two launchers are currently available:
 - Local: Simple runs the commands as new processes on the local machine
 - Slurm: Launch the job by submitting it to slurm using `sbatch`.  
   Slurm options can be set in nxheros `config.json`. For example:
   
````
  {
  "database": { ...  },  "runs": { ...  },  
  "launchers": {
      "slurm" : {
        "batchFileOptions" : {
            "partition" : "main",
            "nodes" : 1,
            "mem" : "4000MB",
            "exclusive" : null,
            "nice": 400,
            "time": "01:00:00"
        },
      "submit" : true
    }
  }
````
If submit is set to `false`, launching the jobgroup will create
the batch files but not submit them to slurm.
 

