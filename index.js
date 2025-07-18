const express = require('express');
const cors = require('cors');
const app = express();
const admin = require("firebase-admin");
const serviceAccount = require("./SDK-KEY.json");
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


// firebase JWT




admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});



const verifyFirebaseToken=async(req,res,next)=>{
  
   const authHeader=req.headers?.authorization;
   
   if(!authHeader || !authHeader.startsWith('Bearer ')){
    return res.status(401).send({message: "Unauthorized Access"})
   }

   
   
   
   const token=authHeader.split(" ")[1];

   
   if(!token){
    return res.status(401).send({message: "Unauthorized Access"})
   }
     
   

   


   try{
    const decoded=await admin.auth().verifyIdToken(token)
    req.decoded=decoded;
    console.log("decoded token",decoded)
    next();
   }catch(error){
      return res.status(401).send({message: "Unauthorized Access"})
   }
    console.log("token in the middle ware",token)
   
}

// firebase jwt end



async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const volunteerPostCollections=client.db('Unity-force').collection('VolunteerNeedPost');
    const applicationsCollections=client.db('Unity-force').collection('VolunteerApplications');


   app.get("/myPosts",verifyFirebaseToken,async(req,res)=>{
    const email=req.query.email;
    if(email !== req.decoded.email){
      return res.status(403).message({message:"Forbidden access"})
    }
    console.log(email)
    const query={};
    if(email){
      query.contactEmail=email;
    }

    const cursor= volunteerPostCollections.find(query)
    const result=await cursor.toArray()
    res.send(result)
   })

   app.get("/allPosts",async(req,res)=>{
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



   app.get("/allPosts/:id",async(req,res)=>{
    const id=req.params.id;
    const query={_id: new ObjectId(id)}
    const result=await volunteerPostCollections.findOne(query)
    res.send(result)
   })


   app.post("/allPosts",async(req,res)=>{
    const newPost=req.body;
    const result=await volunteerPostCollections.insertOne(newPost)
    res.send(result)
   })


   app.put("/allPosts/update/:id",async(req,res)=>{
        const id=req.params.id;
        const data=req.body.data;
        console.log(id,data)

        console.log(data)
        const filter ={_id:new ObjectId(id)}
         const options = { upsert: true };
         const updatedDoc={
          $set:{
            data
          }
         }

         const result=await volunteerPostCollections.updateOne(filter,updatedDoc,options)
         res.send(result)

   }

  )

   app.delete("/myPosts/:id",async(req,res)=>{
    const id=req.params.id;
    console.log(id)
    const query={_id: new ObjectId(id)}
    const result=await volunteerPostCollections.deleteOne(query);
    res.send(result)
   })



  //  application related api
   app.post("/applications",async(req,res)=>{
     const {data, requestedPostId}=req.body;
     
      const userEmail = data.volunteerEmail;
      
      console.log(data,requestedPostId,userEmail)
    try{
      // step 1
       const alreadyExists = await applicationsCollections.findOne({
      volunteerEmail: userEmail,
      postId: requestedPostId,
    });

    if (alreadyExists) {
      return res.status(409).send({
        success: false,
        message: "You have already requested for this post.",
      });
    }
      // step 2
       const result=await applicationsCollections.insertOne(data);

      //  step 3
     
     const updatePost=await volunteerPostCollections.updateOne({_id: new ObjectId(requestedPostId)},{$inc: {volunteersNeeded:-1}});

     res.send({result,updatePost})

    }catch(error){
      console.error("error found",error)
    }
    
   })


   app.get("/applications",verifyFirebaseToken,async(req,res)=>{
    const email=req.query.email;
     
    console.log("decoded email",req.decoded.email)
    if(email !== req.decoded.email){
      return res.status(403).message({message:"Forbidden access"})
    }
    const query={volunteerEmail : email}

    console.log("req header",req.headers)
    const result=await applicationsCollections.find(query).toArray()
    res.send(result)
   })


   app.delete("/applications/:id",async(req,res)=>{
    const id=req.params.id;
    const postId=req.body.postId;
    console.log(postId)
    try{
      const query={_id: new ObjectId(id)}
    const result =await applicationsCollections.deleteOne(query);
      
     const updatePost=await volunteerPostCollections.updateOne({_id: new ObjectId(postId)},{$inc: {volunteersNeeded:+1}});

      res.send({result,updatePost})

    }catch(error){
      console.error("error found",error)
    }
   })

   app.get("/applications/post/:id",async(req,res)=>{
    const id=req.params.id;
    console.log(id)
    
    const query={ postId : id}
    const result=await applicationsCollections.find(query).toArray();
    res.send(result)
   })


   app.patch("/applications/status/:id",async(req,res)=>{
    const id=req.params.id;
    const status=req.body.status;
    console.log(id,status)
    const filter ={_id: new ObjectId(id)}
    const updatedDoc={
      $set:{
        status:req.body.status
      }
    }
    console.log(updatedDoc)

    const result=await applicationsCollections.updateOne(filter,updatedDoc);
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