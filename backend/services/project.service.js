import projectModel from '../db/models/projects.model.js';
import mongoose from 'mongoose';

export const createProject = async ({
    name,
    userId
})=>{
    if(!name || !userId) throw new Error('Name and userID are required');

    let project;
    const existingProject = await projectModel.findOne({ name });
    if (existingProject) {
        throw new Error('Project with this name already exists');
    }

    try {
        project = await projectModel.create({
            name,
            users: [userId]
        });
    } catch (error) {
        throw error; // Re-throw other errors
    }

    return project;
}

export const getAllProjectByUserId = async ({userId})=>{
    if(!userId) throw new Error('UserId is required');

    const allUserProjects = await projectModel.find({ users: userId}) //voh saare projects mijaenge jisme ye userId ho

    return allUserProjects;
}

export const addUserToProject = async ({projectId, users, userId})=>{ //userId is the one who is adding users to the project
    if (!projectId || !users) throw new Error('Project and users are required');

    if(!userId) throw new Error('UserId is required');

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error('Invalid projectId');
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
        throw new Error('Invalid userId');
    }

    if (!Array.isArray(users) || users.some(userId => !mongoose.Types.ObjectId.isValid(userId))) {
        throw new Error('Invalid userId(s) in users array');
    }

    const project = await projectModel.findOne({
        _id: projectId,
        users: userId  //check if the user who is trying to add users is already in the project
    })

    if(!project) throw new Error('User is not in the project or project does not exist');

    const updatedProject = await projectModel.findOneAndUpdate({
        _id: projectId  //find one by projectId
    },{
        $addToSet: {
            users: {
                $each: users  //add each user to the project
            }
        }
    },{

        new: true
    })

    return updatedProject;
}

export const getProjectbyId = async ({ projectId}) => {
    if (!projectId) throw new Error('ProjectId is required');

    if(!mongoose.Types.ObjectId.isValid(projectId)){
        throw new Error('Invalid projectId');
    }

    const project = await projectModel.findOne({
        _id: projectId
    }).populate('users')

    return project;
}

export const updateFileTree = async ({ projectId, fileTree }) => {
    if (!projectId) {
        throw new Error("projectId is required")
    }

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        throw new Error("Invalid projectId")
    }

    if (!fileTree) {
        throw new Error("fileTree is required")
    }

    const project = await projectModel.findOneAndUpdate({
        _id: projectId
    }, {
        fileTree
    }, {
        new: true
    })

    return project;
}