import {Router} from 'express'
import { body } from 'express-validator';
import * as projectController from '../controllers/project.controller.js';
import { authUser } from '../middlewares/auth.middleware.js';


const router = Router();

router.post('/create', authUser,
    body('name').notEmpty().withMessage('Name is required'),
    projectController.createProjectController
)

router.get('/all', authUser, 
    projectController.getAllProjectController
)

router.put('/add-user', authUser, 
    body('projectId').isString().withMessage('Project ID must be a string'),
    body('users').isArray({ min: 1 }).withMessage('Users must be a non-empty array')
        .custom((users) => users.every(user => typeof user === 'string')).withMessage('Each user must be a string'),
    projectController.addUserToProjectController
)

router.get('/get-project/:projectId', authUser, projectController.getProjectbyIdController)
export default router;

router.put('/update-file-tree',
    authUser,
    body('projectId').isString().withMessage('Project ID must be a string'),
    body('fileTree').isObject().withMessage('File tree is required'),
    projectController.updateFileTreeController
)