const User = require("../models/user")
const express = require("express")
const auth = require("../middleware/auth")
const attEdit = require("../middleware/attEdit")

const router = new express.Router()
const { Pool } = require("pg")
// make a new user
router.post("/users/register", async (req, res) => {
  const user = new User(req.body)

  try {
    await user.save()
    const token = await user.generateAuthToken()
    res.status(201).send({ user, token })
  } catch (e) {
    res.status(400).send(e)
  }
})


router.post("/users/login", async (req, res) => {
  try {
    // console.log(req.body.username)
    // console.log(req.body.password)
    const user = await User.findByCredentials(req.body.username, req.body.password)

    // Check if the user has been assigned a role
    if (!user.role) {       
      return res.status(401).json({ message: "User does not have a role assigned." });
    }

    const token = await user.generateAuthToken()
    res.send({ user, token })
  } catch (e) {
    res.status(400).send()
  }
})

router.post("/users/logout", auth, async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token
    })
    await req.user.save()

    res.send()
  } catch (e) {
    res.status(500).send()
  }
})

router.post("/users/logoutAll", auth, async (req, res) => {
  try {
    req.user.tokens = []
    await req.user.save()

    res.send()
  } catch (e) {
    res.status(500).send()
  }
})


router.get("/users/all",auth, async (req, res) => {
   

  try {
     const users = await User.find();
     res.status(200).json(users);
     
  } catch (e) {
    res.status(400).send(e)
  }
})

router.get("/users/me", auth, async (req, res) => {
  res.send(req.user)
})

// router.get("/users/:id", async (req, res) => {
//   const _id = req.params.id

//   try {
//     const user = await User.findById(_id)
//     if (!user) {
//       return res.status(404).send()
//     }
//     res.send(user)
//   } catch (e) {
//     res.status(500).send()
//   }
// })

router.delete("/users/me", auth, async (req, res) => {
  try {
    // const user = await User.findByIdAndDelete(req.user._id)
    await req.user.remove()
    res.send(req.user)
  } catch (e) {
    res.status(500).send(e)
  }
})

router.patch("/users/:id", auth, async (req, res) => {
  const updates = Object.keys(req.body)
   
  try {
    
    updates.forEach((update) => {
      req.user[update] = req.body[update]
    })

    await req.user.save()    
    res.send(req.user)
  } catch (e) {
    res.status(400).send(e)
  }
})

const pool = new Pool({
  host: "localhost",
  port: 5433,
  database: "SirriGeoDB",
  user: "postgres",
  password: "gis123",
})
 
router.post("/api/layers",auth, async (req, res) => {
  let client;

  try {
    //const { schemaNames } = req.query
    const layers = []
    client = await pool.connect();
    const query = `SELECT * FROM public.layers;`

    // for (const schemaName of schemaNames) {
    //   const query = `
    //     SELECT f_table_name
    //     FROM geometry_columns
    //     WHERE f_table_schema = '${schemaName}';`

    const result = await client.query(query)
    const rows = result.rows
    const columnNames = Object.keys(rows[0]);

    for (const row of rows) {
      const layerObject = {};     
       
      for (const columnName of columnNames) {
          layerObject[columnName] = row[columnName];
      }           
      layers.push(layerObject);
     
    }     
    res.send(layers) 

  } catch (error) {
    console.error("Error retrieving layer names from postgis:", error)
    throw error
  } finally {
    if (client) {
        client.release()
    }
  }
})

//
router.post("/api/columns",auth, async (req, res) => {
  let client;

  try {
    //const { schemaNames } = req.query
    
    const layers = []
    client = await pool.connect();
    const query = `SELECT table_name, column_name, data_type
    FROM information_schema.columns
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog', 'public')
    ORDER BY table_schema, table_name, ordinal_position;`
 
    const result = await client.query(query)
    const columnsObjects = result.rows

    // {
    //   "table_name": "oilcap",
    //   "column_name": "id",
    //   "data_type": "integer"
    // },
    // {
    //   "table_name": "oilcap",
    //   "column_name": "geom",
    //   "data_type": "USER-DEFINED"
    // },
    

    
    const resultObj = {};
    for (const item of columnsObjects) {
      const tableName = item.table_name;
      const columnName = item.column_name;
  
      if (!resultObj[tableName]) {
       resultObj[tableName] = [];
      }  
      resultObj[tableName].push(columnName);
    }
    // {
    //   oilcap: ["id", "geom", "OBJECTID"]     
    // }  // resultObj result

    const resultArray = Object.entries(resultObj).map(([tableName, columnNames]) => {
      return [tableName, columnNames];
    }); 
    // [
    //   ["oilcap", ["id", "geom", "OBJECTID"]]      
    // ]   //resultArray result
 
    res.send(resultArray)
  } catch (error) {
    console.error("Error retrieving layer names from postgis:", error)
    throw error
  } finally {
    if (client) {
        client.release()
    }
  }
})
//


router.get("/api/geojson",auth, async (req, res) => {
   let client;
  const storedData = {};

  try {
    const { layerNames, minLng, minLat, maxLng, maxLat } = req.query   
    client = await pool.connect();

    for (const layerName  of layerNames) {

      const schemaName = layerName.substring(0, 3)
      const query = `SELECT * , ST_AsGeoJSON(geom, 5) AS geom2
                   FROM ${schemaName}.${layerName}
                   WHERE ST_Intersects(
                    geom,
                    ST_MakeEnvelope($1, $2, $3, $4, 32640) 
                  )
                   `
      
      const result = await client.query(query, [minLng, minLat, maxLng, maxLat])

      const features = result.rows.map((row) => {
        const properties = {};
        for (const key in row) {               
            if(key !== 'geom' && key !== 'geom2'){     
                properties[key] = row[key];                
            }   
        }

        // add uid to each feature
        properties['uid']= `${layerName}${row['id']}`; 
        

        const feature = {
            type: "Feature",
            geometry: JSON.parse(row.geom2),
            properties: properties,
        }
        return feature
      })

      

      storedData[layerName] = {
        type: "FeatureCollection",
        features: features,
      };
      
    }
     res.json(storedData)
    // console.log(JSON.stringify(storedData['oilwvav']))
    
  } catch (error) {
    console.error("Error executing query:", error)
    res.status(500).send("Internal Server Error")
  } finally {
    if (client) {
       client.release()
    }
  }
})

router.get("/api/summarize",auth, async (req, res) => {
  let client;

  try {
    const { selectedLi, selectedSchemaValue, layerNameSelected } = req.query   
    client = await pool.connect();   
    const query = `SELECT "${selectedLi}" FROM ${selectedSchemaValue}.${layerNameSelected}`;
    
    const result = await client.query(query);

    summarizedValue = []
    result.rows.map(row => {
 
      if(!summarizedValue.includes(row[selectedLi])){
      summarizedValue.push(row[selectedLi])
      }
    })  

     res.json(summarizedValue)
    
  } catch (error) {
    console.error("Error executing query:", error)
    res.status(500).send("Internal Server Error")
  } finally {
    if (client) {
       client.release()
    }
  }
})


router.post("/api/query",auth, async (req, res) => {
   let client;
  

  try {
     const { schema, layer } = req.query; 
      let wherePart = req.body;
   
     
     client = await pool.connect();

     let query;
     if (wherePart.wherePart) { 
           wherePart = `WHERE ${wherePart.wherePart}`;
           query = `SELECT *,ST_AsGeoJSON(geom, 5) AS geom2 FROM ${schema}.${layer} ${wherePart}`; 
          
     } else {
         query = `SELECT *,ST_AsGeoJSON(geom, 5) AS geom2 FROM ${schema}.${layer}`; 
     }

    
       
     
     const result = await client.query(query);

   // exclude geom from array:
   //[ {id = 1 , geom = 100, category = "piping"},
   //  {id = 2 , geom = 150, category = "simple"},
   //  {id = 3 , geom = 200, category = "anotherpiping"} ]

    //  const excludeGeom = result.rows.map(feature => {
    //    const { geom, ...rest } = feature;
    //    return rest;
    //  });  

    const features = result.rows.map((row) => {
        const properties = {};
        for (const key in row) {               
            if(key !== 'geom' && key !== 'geom2'){     
                properties[key] = row[key];                
            }   
        }

        // add uid to each feature
        properties['uid']= `${layer}${row['id']}`;         

        const feature = { geometry: JSON.parse(row.geom2), ...properties}
        return feature
      })

      
 
    

    //

    //   const getArrayOfFeatures = result.rows.map(feature => {
    //    const {  ...rest } = feature;
    //    return rest;
    //  });  

    //  // excludeGeom format : [ {location_type: 'above_ground', size: 20,..}, {...}]

    //  getArrayOfFeatures.map(feature => {
    //    feature['uid'] = `${layer}${feature['id']}`
    //     return null;
    //  });        
       
   

    
     
    return res.json( features);
    
  } catch (error) {
    console.error("Error executing query:", error)
    return res.status(400).json({ error: "Invalid query. Please provide a valid query." });
  } finally {
    if (client) {
       client.release()
    }
  }
})

//


router.post("/api/attrUpdate",auth,attEdit, async (req, res) => {

 let client;
 try {
  const updates = req.body;   
  const keys = Object.keys(updates);
  const firstKey = keys[0];
  const tableName = firstKey.substring(0, 6)
  const schema = firstKey.substring(0, 3)      
     
  client = await pool.connect();  
  let sql = '';

  for (const uid in updates) {
    const columns = updates[uid];
    sql += `UPDATE ${schema}.${tableName} SET `;
    for (const column in columns) {
      const value = columns[column];
      sql += `"${column}" = '${value}', `;
    }
    sql = sql.slice(0, -2); // Remove the trailing comma and space
    const id = uid.substring(6)
    sql += ` WHERE id = ${id};`;
  }
   
   
     const result = await client.query(sql);
  //console.log(result)
    
     return res.json( result);
   
 } catch (error) {
   console.error("Error executing query:", error)
   return res.status(400).json({ error: "Invalid query. Please provide a valid query." });
 } finally {
   if (client) {
      client.release()
   }
 }
})


module.exports = router
