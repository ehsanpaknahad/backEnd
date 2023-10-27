 
 

const attEdit =  (req, res, next) => {

  const user = req.user;
  const updates = req.body;
  const keys = Object.keys(updates);
  const firstKey = keys[0];
  const tableName = firstKey.substring(0, 6);

  if (!user.attributeEditing || !user.attributeEditing.includes(tableName)) {
     return res.status(403).json({ error: "Access denied" });
   
  }
  next()
      
}
module.exports = attEdit
