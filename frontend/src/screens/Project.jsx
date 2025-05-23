import React, { useState, useEffect, useContext, useRef } from 'react'
import { UserContext } from '../context/user.context'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from '../config/axios'
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket'
import Markdown from 'markdown-to-jsx'
import hljs from 'highlight.js';
import { getWebContainer } from '../config/webContainer'
import MonacoEditor from '@monaco-editor/react';


function SyntaxHighlightedCode(props) {
  const ref = useRef(null);

  useEffect(() => {
    if (ref.current && props.className?.includes('lang-')) {
      hljs.highlightElement(ref.current);
      ref.current.removeAttribute('data-highlighted');
    }
  }, [props.className, props.children]);

  return <code {...props} ref={ref} />;
}


const Project = () => {

    const location = useLocation()

    const [ isSidePanelOpen, setIsSidePanelOpen ] = useState(false)
    const [ isModalOpen, setIsModalOpen ] = useState(false)
    const [ selectedUserId, setSelectedUserId ] = useState(new Set()) // Initialized as Set
    const [ project, setProject ] = useState(location.state.proj)
    const [ message, setMessage ] = useState('')
    const { user } = useContext(UserContext)
    const messageBox = React.createRef()

    const [ users, setUsers ] = useState([])
    const [ messages, setMessages ] = useState([]) // New state variable for messages
    const [ fileTree, setFileTree ] = useState({})

    const [ currentFile, setCurrentFile ] = useState(null)
    const [ openFiles, setOpenFiles ] = useState([])

    const [ webContainer, setWebContainer ] = useState(null)
    const [ iframeUrl, setIframeUrl ] = useState(null)

    const [ runProcess, setRunProcess ] = useState(null)

    const handleUserClick = (id) => {
        setSelectedUserId(prevSelectedUserId => {
            const newSelectedUserId = new Set(prevSelectedUserId);
            if (newSelectedUserId.has(id)) {
                newSelectedUserId.delete(id);
            } else {
                newSelectedUserId.add(id);
            }

            return newSelectedUserId;
        });


    }


    function addCollaborators() {

        axios.put("/projects/add-user", {
            projectId: location.state.proj._id,
            users: Array.from(selectedUserId)
        }).then(res => {
            console.log(res.data)
            setIsModalOpen(false)

        }).catch(err => {
            console.log(err)
        })

    }

    const send = () => {

        sendMessage('project-message', {
            message,
            sender: user
        })
        setMessages(prevMessages => [ ...prevMessages, { sender: user, message } ]) // Update messages state
        setMessage("")

    }

    function formatAIResponseToMarkdown(aiResponse) {
        let obj = aiResponse;
        if (typeof aiResponse === 'string') {
            try {
                obj = JSON.parse(aiResponse);
            } catch {
                // Not JSON, treat as plain text (not code)
                return { text: aiResponse, code: null };
            }
        }
        // Handle Gemini-style functions array (Google Gemini, OpenAI, or custom)
        if (Array.isArray(obj.functions)) {
            let md = '';
            obj.functions.forEach(fn => {
                const name = fn.functionName || fn.name || 'Function';
                const desc = fn.description || '';
                const params = fn.parameters || [];
                const returnType = fn.returnType || (fn.return && (fn.return.type || fn.return)) || '';
                const returnDesc = fn.return && fn.return.description ? fn.return.description : '';
                const codeStr = fn.implementation || fn.code || '';
                const example = fn.example;
                const errorHandling = fn.errorHandling;
                md += `### ${name}\n`;
                if (desc) md += `**Description:** ${desc}\n\n`;
                if (params.length) {
                    md += `**Parameters:**\n`;
                    md += `| Name | Type | Description |\n|---|---|---|\n`;
                    params.forEach(p => {
                        md += `| ${p.name} | ${p.type} | ${p.description} |\n`;
                    });
                    md += '\n';
                }
                if (returnType) {
                    md += `**Returns:** \\\`${returnType}\\\``;
                    if (returnDesc) md += ` - ${returnDesc}`;
                    md += '\n\n';
                }
                if (errorHandling) {
                    md += `**Error Handling:** ${errorHandling}\n\n`;
                }
                if (codeStr) {
                    md += '```js\n' + codeStr + '\n```\n';
                }
                if (example) {
                    md += '**Example:**\n';
                    if (example.input) {
                        md += `Input: \`${JSON.stringify(example.input)}\`\n`;
                    }
                    if (example.output !== undefined) {
                        md += `Output: \`${JSON.stringify(example.output)}\`\n`;
                    }
                }
                md += '\n---\n';
            });
            return { text: obj.text || '', code: md };
        }
        // Handle code as file tree object
        if (obj.code && typeof obj.code === 'object' && !Array.isArray(obj.code)) {
            let md = '';
            for (const [filename, fileObj] of Object.entries(obj.code)) {
                const contents = fileObj.file && fileObj.file.contents ? fileObj.file.contents : '';
                md += `#### ${filename}\n`;
                md += '```js\n' + contents + '\n```\n';
            }
            // Also handle exampleUsage if present
            if (obj.exampleUsage && obj.exampleUsage.file && obj.exampleUsage.file.contents) {
                md += `\n**Example Usage:**\n`;
                md += '```js\n' + obj.exampleUsage.file.contents + '\n```\n';
            }
            return { text: obj.text || '', code: md };
        }
        const code = obj.function || obj.code || obj.functions || '';
        const text = obj.text || '';
        return { text, code: code ? `\u0060\u0060\u0060js\n${code}\n\u0060\u0060\u0060` : null };
    }

    function WriteAiMessage(message) {
        const { text, code } = formatAIResponseToMarkdown(message);
        return (
            <div className='overflow-auto bg-slate-950 text-white rounded-sm p-2 w-full'>
                {text && (
                    <Markdown
                        children={text}
                        options={{
                            overrides: {
                                code: SyntaxHighlightedCode,
                            },
                        }}
                    />
                )}
                {code && (
                    <div className="mt-2">
                        <Markdown
                            children={code}
                            options={{
                                overrides: {
                                    code: SyntaxHighlightedCode,
                                },
                            }}
                        />
                    </div>
                )}
            </div>
        );
    }

    useEffect(() => {

        initializeSocket(project._id)

        if (!webContainer) {
            getWebContainer().then(container => {
                setWebContainer(container)
                console.log("container started")
            })
        }


        receiveMessage('project-message', data => {

            console.log(data)
            
            if (data.sender._id == 'ai') {


                const message = JSON.parse(data.message)

                console.log(message)

                webContainer?.mount(message.fileTree)

                if (message.fileTree) {
                    setFileTree(message.fileTree || {})
                }
                setMessages(prevMessages => [ ...prevMessages, data ]) // Update messages state
            } else {


                setMessages(prevMessages => [ ...prevMessages, data ]) // Update messages state
            }
        })


        axios.get(`/projects/get-project/${location.state.proj._id}`).then(res => {

            console.log(res.data.project)

            setProject(res.data.project)
            setFileTree(res.data.project.fileTree || {})
        })

        axios.get('/users/all').then(res => {

            setUsers(res.data.users)

        }).catch(err => {

            console.log(err)

        })

    }, [])

    function saveFileTree(ft) {
        axios.put('/projects/update-file-tree', {
            projectId: project._id,
            fileTree: ft
        }).then(res => {
            console.log(res.data)
        }).catch(err => {
            console.log(err)
        })
    }


    // Removed appendIncomingMessage and appendOutgoingMessage functions

    function scrollToBottom() {
        messageBox.current.scrollTop = messageBox.current.scrollHeight
    }

    useEffect(() => {
      scrollToBottom();
    }, [messages]);


    return (
        <main className='h-screen w-screen flex bg-gradient-to-br from-[#23272e] via-[#1e1e2f] to-[#23272e] text-white'>
            <section className="left relative flex flex-col h-screen min-w-96 bg-gradient-to-b from-[#23272e] to-[#23274d] border-r border-[#222] shadow-lg">
                <header className='flex justify-between items-center p-2 px-4 w-full bg-gradient-to-r from-[#23272e] to-[#2d2f4d] border-b border-[#222] absolute z-10 top-0'>
                    <button className='flex gap-2 text-white hover:bg-[#3b3f5c] rounded transition' onClick={() => setIsModalOpen(true)}>
                        <i className="ri-add-fill mr-1"></i>
                        <p>Add collaborator</p>
                    </button>
                    <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className='p-2 text-white hover:bg-[#3b3f5c] rounded transition'>
                        <i className="ri-group-fill"></i>
                    </button>
                </header>
                <div className="conversation-area max-w-96 pt-14 pb-10 flex-grow flex flex-col h-full relative bg-gradient-to-b from-[#23272e] to-[#23274d]">
                    <div
                        ref={messageBox}
                        className="message-box p-1 flex-grow flex flex-col gap-1 overflow-auto max-h-full scrollbar-hide">
                        {messages.map((msg, index) => {
                            const isAI = msg.sender._id === 'ai';
                            const isSelf = msg.sender._id == user._id.toString();
                            const isOther = !isAI && !isSelf;
                            return (
                                <div
                                    key={index}
                                    className={`message flex flex-col p-2 rounded-md shadow-md 
                                        ${isAI ? 'bg-gray-900 border-l-4 border-blue-400 w-full max-w-full' : isSelf ? 'bg-purple-900 border-l-4 border-purple-400 ml-auto max-w-52 min-w-16' : 'bg-cyan-900 border-l-4 border-cyan-400 max-w-52'}
                                        ${isSelf ? 'self-end' : 'self-start'}`}
                                >
                                    <small className={`opacity-65 text-xs mb-1 ${isAI ? 'text-blue-300' : isSelf ? 'text-purple-300 text-right' : 'text-cyan-200'}`}>
                                        {isAI ? 'AI' : isSelf ? 'You' : msg.sender.email}
                                    </small>
                                    <div className={`text-sm break-words ${isAI ? 'text-blue-100' : isSelf ? 'text-purple-100' : 'text-cyan-100'}`}>
                                        {isAI ? WriteAiMessage(msg.message) : <p>{msg.message}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="inputField w-full flex absolute bottom-0 bg-gradient-to-r from-[#23272e] to-[#2d2f4d] border-t border-[#222]">
                        <input
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                send();
                              }
                            }}
                            className='p-2 px-4 border-none outline-none flex-grow bg-transparent text-white placeholder-gray-400' type="text" placeholder='Enter message' />
                        <button
                            onClick={send}
                            className='px-5 bg-gradient-to-r from-[#5f4bb6] to-[#7c3aed] text-white hover:from-[#7c3aed] hover:to-[#5f4bb6] transition rounded'><i className="ri-send-plane-fill"></i></button>
                    </div>
                </div>
                <div className={`sidePanel w-full h-full flex flex-col gap-2 bg-gradient-to-b from-[#23272e] to-[#23274d] border-l border-[#222] absolute transition-all ${isSidePanelOpen ? 'translate-x-0' : '-translate-x-full'} top-0`}>
                    <header className='flex justify-between items-center px-4 p-2 bg-gradient-to-r from-[#23272e] to-[#2d2f4d] border-b border-[#222]'>
                        <h1 className='font-semibold text-lg text-white'>Collaborators</h1>
                        <button onClick={() => setIsSidePanelOpen(!isSidePanelOpen)} className='p-2 text-white hover:bg-[#3b3f5c] rounded transition'>
                            <i className="ri-close-fill"></i>
                        </button>
                    </header>
                    <div className="users flex flex-col gap-2">
                        {project.users && project.users.map(user => {
                            return (
                                <div className="user cursor-pointer hover:bg-slate-200 p-2 flex gap-2 items-center">
                                    <div className='aspect-square rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className="ri-user-fill absolute"></i>
                                    </div>
                                    <h1 className='font-semibold text-lg'>{user.email}</h1>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </section>
            <section className="right bg-gradient-to-br from-[#1e1e2f] via-[#23274d] to-[#1e1e2f] flex-grow h-full flex">
                <div className="explorer h-full max-w-64 min-w-52 bg-slate-900 border-r border-[#222] shadow-lg">
                    <div class="file-tree w-full">
                        {
                            Object.keys(fileTree).map((file, index) => (
                                <button
                                    key={index}
                                    onClick={() => {
                                        setCurrentFile(file)
                                        setOpenFiles([ ...new Set([ ...openFiles, file ]) ])
                                    }}
                                    className="tree-element cursor-pointer p-2 px-4 flex items-center gap-2 bg-slate-950 w-full">
                                    <p
                                        className='font-semibold text-lg'
                                    >{file}</p>
                                </button>))

                        }
                    </div>
                </div>
                <div className="code-editor flex flex-col flex-grow h-full shrink bg-gradient-to-br from-[#1e1e2f] via-[#23274d] to-[#1e1e2f] shadow-inner">
                    <div className="top flex justify-between w-full">
                        <div className="files flex">
                            {
                                openFiles.map((file, index) => (
                                    <button
                                        key={index}
                                        onClick={() => setCurrentFile(file)}
                                        className={`open-file cursor-pointer p-2 px-4 flex items-center w-fit gap-2 bg-slate-950 ${currentFile === file ? 'bg-slate-800' : ''}`}>
                                        <p
                                            className='font-semibold text-lg'
                                        >{file}</p>
                                    </button>
                                ))
                            }
                        </div>
                        <div className="actions flex gap-2">
                            <button
                                onClick={async () => {
                                    await webContainer.mount(fileTree)
                                    const installProcess = await webContainer.spawn("npm", [ "install" ])
                                    installProcess.output.pipeTo(new WritableStream({
                                        write(chunk) {
                                            console.log(chunk)
                                        }
                                    }))
                                    if (runProcess) {
                                        runProcess.kill()
                                    }
                                    let tempRunProcess = await webContainer.spawn("npm", [ "start" ]);
                                    tempRunProcess.output.pipeTo(new WritableStream({
                                        write(chunk) {
                                            console.log(chunk)
                                        }
                                    }))
                                    setRunProcess(tempRunProcess)
                                    webContainer.on('server-ready', (port, url) => {
                                        console.log(port, url)
                                        setIframeUrl(url)
                                    })
                                }}
                                className='p-2 px-4 bg-slate-300 text-white hidden'
                            >
                                run
                            </button>
                        </div>
                    </div>
                    <div className="bottom flex flex-grow max-w-full shrink overflow-auto">
                        {fileTree[currentFile] && fileTree[currentFile].file && typeof fileTree[currentFile].file.contents === 'string' ? (
                            <div className="code-editor-area h-full overflow-auto flex-grow bg-[#1e1e1e]">
                                <MonacoEditor
                                    height="100%"
                                    width="100%"
                                    language={currentFile.endsWith('.js') ? 'javascript' : currentFile.endsWith('.json') ? 'json' : 'plaintext'}
                                    theme="vs-dark"
                                    value={fileTree[currentFile].file.contents}
                                    options={{
                                        fontSize: 16,
                                        minimap: { enabled: false },
                                        scrollBeyondLastLine: false,
                                        wordWrap: 'on',
                                        fontFamily: 'Fira Mono, Menlo, Monaco, Consolas, monospace',
                                        automaticLayout: true,
                                    }}
                                    onChange={(value) => {
                                        const ft = {
                                            ...fileTree,
                                            [ currentFile ]: {
                                                file: {
                                                    contents: value || ''
                                                }
                                            }
                                        };
                                        setFileTree(ft);
                                        saveFileTree(ft);
                                    }}
                                />
                            </div>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white bg-[#1e1e1e]">
                                <span>Empty File</span>
                            </div>
                        )}
                    </div>
                </div>
                {iframeUrl && webContainer &&
                    (<div className="flex min-w-96 flex-col h-full bg-gradient-to-b from-[#23272e] to-[#23274d] border-l border-[#222] shadow-lg">
                        <div className="address-bar">
                            <input type="text"
                                onChange={(e) => setIframeUrl(e.target.value)}
                                value={iframeUrl} className="w-full p-2 px-4 bg-gradient-to-r from-[#23272e] to-[#2d2f4d] text-white border-b border-[#222]" />
                        </div>
                        <iframe src={iframeUrl} className="w-full h-full bg-[#1e1e2f]"></iframe>
                    </div>)
                }
            </section>
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center">
                    <div className="bg-gradient-to-b from-[#23272e] to-[#23274d] p-4 rounded-md w-96 max-w-full relative border border-[#222] text-white shadow-2xl">
                        <header className='flex justify-between items-center mb-4'>
                            <h2 className='text-xl font-semibold'>Select User</h2>
                            <button onClick={() => setIsModalOpen(false)} className='p-2 text-white hover:bg-[#3b3f5c] rounded transition'>
                                <i className="ri-close-fill"></i>
                            </button>
                        </header>
                        <div className="users-list flex flex-col gap-2 mb-16 max-h-96 overflow-auto">
                            {users.map(user => (
                                <div key={user.id} className={`user cursor-pointer hover:bg-slate-200 ${Array.from(selectedUserId).indexOf(user._id) != -1 ? 'bg-slate-200' : ""} p-2 flex gap-2 items-center`} onClick={() => handleUserClick(user._id)}>
                                    <div className='aspect-square relative rounded-full w-fit h-fit flex items-center justify-center p-5 text-white bg-slate-600'>
                                        <i className="ri-user-fill absolute"></i>
                                    </div>
                                    <h1 className='font-semibold text-lg'>{user.email}</h1>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addCollaborators}
                            className='absolute bottom-4 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-gradient-to-r from-[#5f4bb6] to-[#7c3aed] text-white rounded-md hover:from-[#7c3aed] hover:to-[#5f4bb6] transition'>
                            Add Collaborators
                        </button>
                    </div>
                </div>
            )}
        </main>
    )
}

export default Project