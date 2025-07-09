const express = require('express');
const cors = require('cors');
const app = express();
const port =process.env.PORT|| 3000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config()

// Middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cmpq8iw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const volunteerPostCollections=client.db('Unity-force').collection('VolunteerNeedPost');


   app.get("/needPosts",async(req,res)=>{
    const email=req.query.email;
    console.log(email)
    const query={status:"active"};
    if(email){
      query.contactEmail=email;
    }

    const cursor= volunteerPostCollections.find(query)
    const result=await cursor.toArray()
    res.send(result)
   })

   app.get("/needAllPosts",async(req,res)=>{
    const {category,search}=req.query;

    console.log(search,category)
     const query={status:"active"};
    if(category){
      query.category=category;
    }

    if(search){
       query.title = { $regex: search, $options: "i" };
    }




    const cursor= volunteerPostCollections.find(query)
    const result=await cursor.toArray()
    res.send(result)
   })



   app.get("/needAllPosts/:id",async(req,res)=>{
    const id=req.params.id;
    const query={_id: new ObjectId(id)}
    const result=await volunteerPostCollections.findOne(query)
    res.send(result)
   })


   app.post("/needPost",async(req,res)=>{
    const newPost=req.body;
    const result=await volunteerPostCollections.insertOne(newPost)
    res.send(result)
   })

   app.delete("/needPosts/:id",async(req,res)=>{
    const id=req.params.id;
    console.log(id)
    const query={_id: new ObjectId(id)}
    const result=await volunteerPostCollections.deleteOne(query);
    res.send(result)
   })






    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send('Server is running!');
});





app.listen(port, () => {
  console.log(`Server is running on ${port}`);
});