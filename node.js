
const ffi = require('ffi-napi');
const ref = require('ref-napi');

const sqlite3 = ref.types.void;
const sqlite3Ptr = ref.refType(sqlite3);
const sqlite3PtrPtr = ref.refType(sqlite3Ptr);

const sqlstatement = ref.types.void;
const sqlstatementPtr = ref.refType(sqlstatement);
const sqlstatementPtrPtr = ref.refType(sqlstatementPtr);


// yoink constants from reading sqlite3.h and put here

const _lib = ffi.Library('libsqlite3', {
  'sqlite3_open': [ 'int', [ 'string', sqlite3PtrPtr ] ],
  'sqlite3_prepare_v2': [ 'int', [ sqlite3Ptr, 'string', 'int', sqlstatementPtrPtr, 'int' ] ],
  'sqlite3_close': [ 'int', [ sqlite3Ptr ] ],
  'sqlite3_exec': [ 'int', [ sqlite3Ptr, 'string', 'pointer', 'pointer', 'string' ] ],
  'sqlite3_column_count': ['int', [sqlstatementPtr]],
  'sqlite3_column_name': ['string',[sqlstatementPtr, 'int']],
  'sqlite3_column_text': ['string',[sqlstatementPtr, 'int']],
  'sqlite3_column_type': ['int',[sqlstatementPtr, 'int']],
  'sqlite3_libversion': ['string', []],
  'sqlite3_changes': ['int', [sqlite3Ptr]],
  'sqlite3_column_int64': ['int',[sqlstatementPtr, 'int']],
  'sqlite3_column_double': ['double',[sqlstatementPtr, 'int']],
  
  //bind stuff
  'sqlite3_bind_int64': ['int',[sqlstatementPtr,'int','long long']],
  'sqlite3_bind_double': ['double',[sqlstatementPtr,'int','double']],
  'sqlite3_bind_text':['string',[sqlstatementPtr,'int', 'string', 'int', 'long long']],
  'sqlite3_step': ['int', [sqlstatementPtr]]
});


// eventually, your code should be structured into this class
class SQLite {
  #db; 
  constructor(filename=':memory:') 
  { 
    this.#db = ref.alloc(sqlite3PtrPtr);
    const rc = _lib.sqlite3_open(':memory:', this.#db);   
    if (rc !== 0)
    {
        return 2;
    }
  }
  
  
  query(statement, binding=[]) 
  {
    const res = ref.alloc(sqlstatementPtrPtr);
    let rc = _lib.sqlite3_prepare_v2(this.#db.deref(), statement, -1, res, 0);
    let array_dict = [];
    if (rc !== 0) 
    {
      return 1; 
    }

    for (let i = 0; i < binding.length;i++)
    {
        let typeBind = typeof binding[i];
        let num = 1;
        let intFlag = 1;
        const param = binding[i];
        if (Number.isInteger(num))
        {
          intFlag = 0;
        }
        switch (typeBind)
        {
            case "string":
              rc = _lib.sqlite3_bind_text(res.deref(),i+1,param,param.length,0);
              break;
            case "number":
              if (intFlag === 1) { rc._lib.sqlite3_bind_double(res.deref(),i+1,param); }
              else { rc = _lib.sqlite3_bind_int64(res.deref(),i+1,param);}
              break; 

        }

    }
    while(_lib.sqlite3_step(res.deref()) === 100) 
    {
        let dict = {}; 
        let columns = _lib.sqlite3_column_count(res.deref()); 
        for (let i = 0; i < columns;i++)
        {
            let type = _lib.sqlite3_column_type(res.deref(),i);
            let cname = _lib.sqlite3_column_name(res.deref(),i);
            let tex;
            switch(type)
            {
                case 1:
                  tex = _lib.sqlite3_column_int64(res.deref(),i);
                  break; 
                case 2:
                  tex = _lib.sqlite3_column_double(res.deref(),i); 
                  break;
                // case 4:
                case 5:
                  tex = null;
                  break;
                case 3:
                  tex = _lib.sqlite3_column_text(res.deref(), i); 
            }
            dict[cname] = tex; 
        }
        array_dict.push(dict); 
    }
    return array_dict; 
  }

  init(filename = ':memory')
  {
    db = new SQLite(filename); 
  }


  close()
    {
      _lib.sqlite3_close(this.#db.deref()); 
    }


    


}



let db;  
function init(filename = ':memory:')
{
  db = new SQLite(filename); 
}


function sql(str,...val)
{

  let statement = ""; 
   if (db  === undefined)
   {
    return 1; 
   }

  statement = str.join("?"); 

  return db.query(statement,val)

}


// use below as a playground

module.exports = {init, sql}; 










