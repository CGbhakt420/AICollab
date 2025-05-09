import User from "../db/models/user.model.js";
import * as userService from "../services/user.service.js";
import { validationResult } from "express-validator";
import redisClient from "../services/redis.service.js";

export const createUserController = async (req, res)=>{
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array()});
    }

    try{
        const user = await userService.createUser(req.body);

        const token = await user.generateJWT();
        delete user._doc.password;  //so that password is not sent in the response and doesnt show up in console
        res.status(201).json({ user, token });
    }
    catch(error){
        res.status(400).send(error.message);
    }

}

export const loginController = async (req, res)=>{
    const errors = validationResult(req);
    //check for any errors in the input field validation by express-validator
    if(!errors.isEmpty()){
        return res.status(400).json({ errors: errors.array()});
    }

    try{
        const {email, password} = req.body;

        const user = await User.findOne({email});
        if(!user){
            return res.status(401).json({
                errors: 'email not registered'
            })
        }

        const isMatch = await user.isValidPassword(password);

        if(!isMatch){
            return res.status(401).json({
                errors: "Invalid password"
            })
        }

        const token = await user.generateJWT();
        delete user._doc.password;
        res.status(200).json({user, token});
    }
    catch(err){
        console.log(err);
        res.status(400).send(err.message);
    }
}

export const profileController = async (req, res)=>{
    console.log(req.user);
    res.status(200).json({
        user: req.user
    });
}

export const logoutController = async (req, res)=>{
    try{
        const token = req.cookies.token || req.headers.authorization.split(' ')[1];
        redisClient.set(token, 'logout', 'EX', 60*60*24); //ex = expiration after 24hrs
        res.status(200).json({
            message: 'Logged out succesfully',
        });

    }
    catch(err){
        console.log(err);
        res.status(400).send(err.message);
    }
}