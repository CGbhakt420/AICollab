import projectModel from '../db/models/projects.model.js';
import { createProject, getAllProjectByUserId, addUserToProject, getProjectbyId } from '../services/project.service.js';
import { validationResult } from 'express-validator';
import userModel from '../db/models/user.model.js'



export const createProjectController = async (req, res)=>{
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        return res.status(400).json({
            errors: errors.array()
        })
    }

    try{
        const {name} = req.body;
    const loggedInUser = await userModel.findOne({email: req.user.email});

    const userId = loggedInUser._id;

    const newProject = await createProject({
        name,
        userId
    })

    res.status(201).json(newProject);
    }
    catch(err){
        console.log(err);
        res.status(400).send(err.message);
    }

}

export const getAllProjectController = async (req, res)=>{
    try{
        const loggedInUser = await userModel.findOne({email: req.user.email});

        const allUserProjects = await getAllProjectByUserId({
            userId: loggedInUser._id
        })

        return res.status(200).json({
            projects: allUserProjects
        })

    }
    catch(err){
        console.log(err);
        res.status(400).send(err.message);
    }
}

export const addUserToProjectController = async (req, res)=>{
    const errors = validationResult(req);
    if(!errors.isEmpty()){
        return res.status(400).json({errors: errors.array()});
    }

    try{
        const {projectId, users} = req.body;
        const loggedInUser = await userModel.findOne({email: req.user.email});

        const project = await addUserToProject({
            projectId,
            users,
            userId: loggedInUser._id
        })

        return res.status(200).json({
            project
        })
    }
    catch(err){
        console.log(err);
        res.status(400).send(err.message);
    }
}

export const getProjectbyIdController = async (req, res)=>{
    const {projectId} = req.params;

    try{
        const project = await getProjectbyId({ projectId });
        return res.status(200).json({
            project
        })
    }
    catch(err){
        console.log(err);
        res.status(400).send(err.message);
    }
}

export const updateFileTreeController = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {

        const { projectId, fileTree } = req.body;

        const project = await projectService.updateFileTree({
            projectId,
            fileTree
        })

        return res.status(200).json({
            project
        })

    } catch (err) {
        console.log(err)
        res.status(400).json({ error: err.message })
    }

}