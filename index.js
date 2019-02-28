const express = require("express");
const app = express();
const server = require("http").createServer(app);
const bodyParser = require("body-parser");

const mongo = require("mongodb").MongoClient;
//const client = require("socket.io").listen(4000).sockets;
const client = require("socket.io").listen(server);
server.listen(process.env.PORT || 4000);

app.get("/", function(req, res){
    res.sendFile(__dirname + "/index.html");
});


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));

users = [];
connections = [];

//connect to mongo
//let url ="mongodb://mymongouser:hellomongouser123@rnc-shard-00-00-6vzo0.mongodb.net:27017,rnc-shard-00-01-6vzo0.mongodb.net:27017,rnc-shard-00-02-6vzo0.mongodb.net:27017/chat-app?ssl=true&replicaSet=RNC-shard-0&authSource=admin&retryWrites=true";
let dbUrl = "mongodb+srv://mymongouser:hellomongouser123@rnc-6vzo0.mongodb.net/chat-app?retryWrites=true";
const url = process.env.MONGODB_URI || dbUrl;
mongo.connect(url, {useNewUrlParser: true},function(err,db){
    if(err){
        throw err;
    }
    console.log("MongoDB connected...");

    //connect to Socket.io
    client.on("connection", function(socket){
        //count the connections
        /* connections.push(socket);
        console.log("Connected: %s sockets connected", connections.length); */
        
     /*    socket.on("disconnect", function(data){
            connections.splice(connections.indexOf(socket), 1);
            console.log("Disconnected: %s sockets connected", connections.length);
        }); */
       

        let chat = db.db("chat-app").collection("chats");
        
        //create function to send status
        sendStatus = function(s){
            socket.emit("status",s); 
        }

        //get chat from mongo collection
        chat.find().limit(100).sort({_id:1}).toArray(function(err,res){
            if(err){
                throw err;
            }
            //emit the message
            socket.emit("output", res);
        });

        //handle input events
        socket.on("input", function(data){
            let name = data.name;
            let message = data.message;

            //check for name and message
            if(name =="" || message == ""){
                //send error status
                sendStatus("Please enter a name and message");
            } else {
                //insert message
                chat.insert({name:name, message: message}, function(){
                    client.emit("output", [data]);
                    //send status object
                    sendStatus({
                        message:"Message sent",
                        clear: true
                    });
                });
            }
        });

        //handle clear
        socket.on("clear", function(data){
            //remove all chats from collection
            chat.remove({}, function(){
                //emit cleared
                socket.emit("cleared");
            });
        });

        //handle typing message
        socket.on("typing", function(data){
            socket.broadcast.emit("typing", data);
        });


    });
});