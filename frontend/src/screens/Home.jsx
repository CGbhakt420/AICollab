import React, { useState, useEffect } from 'react';
import axios from  "../config/axios";
import { useNavigate } from 'react-router-dom';

// ProjectCard component
function ProjectCard({ proj, onClick }) {
    return (
        <div
            onClick={onClick}
            className="cursor-pointer flex flex-col gap-2 p-4 bg-white rounded-xl shadow-lg border border-gray-200 text-center hover:bg-blue-50 min-w-56 transition-all duration-200 group"
        >
            <h2 className="text-lg font-bold text-blue-700 group-hover:text-blue-900 truncate">{proj.name}</h2>
            <div className='flex gap-2 items-center justify-center text-gray-600'>
                <i className="ri-group-line"></i>
                <small>Collaborators:</small>
                <span className="font-semibold text-blue-500">{proj.users.length}</span>
            </div>
        </div>
    );
}

const Home = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectName, setprojectName] = useState(null)
    const [project, setproject] = useState([])

    const navigate = useNavigate();

    function createProject(e) {
        e.preventDefault();
        axios.post('/projects/create',{
            name: projectName,
        }).then((res)=>{
            setIsModalOpen(false);
            setprojectName("");
            // Fetch projects again after creating
            axios.get('/projects/all').then((res)=>{
                setproject(res.data.projects);
            });
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
        <main className="relative min-h-screen w-full overflow-hidden">
            {/* Designer background */}
            <div className="absolute inset-0 -z-10">
                {/* Gradient blobs */}
                <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-300 rounded-full filter blur-3xl opacity-40 animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-200 rounded-full filter blur-3xl opacity-40 animate-pulse" />
                <div className="absolute top-1/2 left-1/2 w-[600px] h-[300px] bg-gradient-to-r from-blue-100 via-pink-100 to-purple-100 rounded-full filter blur-2xl opacity-30 -translate-x-1/2 -translate-y-1/2" />
                {/* Subtle grid overlay */}
                <svg className="absolute inset-0 w-full h-full opacity-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 100 100" preserveAspectRatio="none">
                    <defs>
                        <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="gray" strokeWidth="0.5" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />
                </svg>
            </div>
            <section className="projects py-10 px-6 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-extrabold text-blue-800">Your Projects</h1>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 font-semibold transition"
                    >
                        + New Project
                    </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    {project.map((proj) => (
                        <ProjectCard
                            key={proj.id}
                            proj={proj}
                            onClick={() => navigate('/project', { state: { proj } })}
                        />
                    ))}
                </div>
            </section>
            {isModalOpen && (
                <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
                    <div className="bg-white p-6 rounded-xl shadow-2xl w-96 max-w-full">
                        <h2 className="text-2xl font-bold mb-4 text-blue-700">New Project</h2>
                        <form onSubmit={createProject}>
                            <input
                                onChange={(e) => setprojectName(e.target.value)}
                                value={projectName}
                                type="text"
                                className="w-full p-3 border border-blue-200 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Project Name"
                                required
                            />
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 text-gray-700"
                                    onClick={() => setIsModalOpen(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 font-semibold"
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
