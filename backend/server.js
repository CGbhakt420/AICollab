import dotenv from 'dotenv';
dotenv.config();
import http from 'http';
import app from './app.js';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import projectModel from './db/models/projects.model.js';
import { generateResult } from './services/ai.service.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // adjust this for production
    methods: ['GET', 'POST'],
  }
});

// JWT auth middleware
io.use(async (socket, next) => {
  try {

    const projectId = socket.handshake.query.projectId;

    // Validate projectId
    if (!projectId || !mongoose.Types.ObjectId.isValid(projectId)) {
      return next(new Error('Authentication error: Invalid or missing projectId'));
    }

    socket.project = await projectModel.findById(projectId);
    
    const token = socket.handshake.auth?.token ||
      (socket.handshake.headers.authorization?.startsWith('bearer ')
        ? socket.handshake.headers.authorization.split(' ')[1]
        : null);

    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded; // Attach user info to socket
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return next(new Error('Authentication error: Invalid token'));
  }
});

// Socket events
io.on('connection', (socket) => {
  console.log('a user connected:', socket.user);

  console.log("Project ID:", socket.project._id.toString());

  socket.roomId = socket.project._id.toString();

  socket.join(socket.roomId);

  socket.on('project-message', async (data)=>{
    const message = data.message;
    console.log("Message received:", data);
    socket.broadcast.to(socket.roomId).emit('project-message', data);
    const aiIsPresentInMessage = message.includes('@ai');
    if (aiIsPresentInMessage){
        // socket.emit('project-message',{
        //     sender: data.sender,
        //     message: 'AI is present in the message'
        // })
        const prompt = message.replace('@ai', ' ');
        const result = await generateResult(prompt);

        io.to(socket.roomId).emit('project-message',{    //io.to because reply sabhi ko bhejna hai not like broadcast
            message: result,
            sender:{
                _id: 'ai',
                email: 'AI'
            }
        })  
        return
    }
    
  })


  socket.on('disconnect', () => {
    console.log('user disconnected');
    socket.leave(socket.roomId);
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
