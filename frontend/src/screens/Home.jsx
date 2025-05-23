import React, { useState, useEffect } from 'react';
import axios from  "../config/axios";
import { useNavigate } from 'react-router-dom';

const Home = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setprojectName] = useState(null)
    const [project, setproject] = useState([])

    const navigate = useNavigate();

    function createProject(e) {
        e.preventDefault();

        console.log({projectName});

        axios.post('/projects/create',{
            name: projectName,
        }).then((res)=>{
            console.log(res.data);
            setIsModalOpen(false);
        })
    }

    useEffect(()=>{
        axios.get('/projects/all').then((res)=>{
            // console.log(res.data);
            setproject(res.data.projects);
        }).catch((err)=>{
            console.log(err);
        })
    }, [])

    return (
        <main className="p-6 bg-gray-100 min-h-screen">
            {/* Projects Section */}
            <section className="projects space-y-4 flex flex-wrap gap-3">
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="px-4 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    + New Project
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 ">
                    {project.map((proj) => (
                        <div
                            onClick={()=> navigate('/project', {
                                state: { proj }
                            })}
                            key={proj.id}
                            className="cursor-pointer flex flex-col gap-2 p-4 bg-white rounded-lg shadow border text-center hover:bg-gray-100 min-w-56"
                        >
                            <h2 className="text-lg font-semibold">{proj.name}</h2>

                            <div className='flex gap-2'>
                            <p><i className="ri-group-line"></i><small> Collaborators: </small></p>
                                {proj.users.length}
                            </div>
                        </div>
                    ))}
                </div>
            </section>
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="bg-white p-4 rounded shadow w-80">
                        <h2 className="text-xl font-bold mb-4">New Project</h2>
                        <form onSubmit={createProject}>
                            <input
                                onChange={(e) => setprojectName(e.target.value)}
                                value={projectName}
                                type="text"
                                className="w-full p-2 border rounded mb-4"
                                placeholder="Project Name"
                                required
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="px-3 py-1 bg-gray-300 rounded hover:bg-gray-400"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                                >
                                    Create
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
};

export default Home;
