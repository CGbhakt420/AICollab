import React, { useEffect, useState, useContext, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import axios from '../config/axios';
import { initializeSocket, receiveMessage, sendMessage } from '../config/socket';
import { UserContext } from '../context/user.context';
import Markdown from 'markdown-to-jsx';
import hljs from 'highlight.js';
import 'highlight.js/styles/github-dark.css';
import MonacoEditor from '@monaco-editor/react';
import { getWebContainer } from '../config/webContainer';

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
  const location = useLocation();
  const [sidePanelOpen, setSidePanelOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [users, setUsers] = useState([]);
  const [project, setProject] = useState(location.state.proj);
  const [message, setMessage] = useState('');
  const { user } = useContext(UserContext);
  const messageBox = useRef(null);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [fileTree, setFileTree] = useState({
    // "app.js":{
    //   content: `const express = require('express');`
    // },
    // "package.json":{
    //   content:`{nedfszfa}`
    // }
  })

  const [currentFile, setCurrentFile] = useState(null)
  const [ openFiles, setOpenFiles ] = useState([])
  const [webContainer, setWebContainer] = useState(null)

  const handleUserSelect = (id) => {
    setSelectedUserIds((prev) =>
      prev.includes(id) ? prev.filter((uid) => uid !== id) : [...prev, id]
    );
  };

  function addCollaborators() {
    if (!location?.state?.proj?._id) {
      console.error("Project ID is missing from location.state");
      return;
    }

    axios
      .put("/projects/add-user", {
        projectId: location.state.proj._id,
        users: selectedUserIds,
      })
      .then(() => {
        setModalOpen(false);
      })
      .catch((err) => {
        console.log(err);
      });
  }

  function scrollToBottom() {
    const el = messageBox.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }

  function send() {
    if (!message.trim()) return;
    const messageObject = {
      message,
      sender: user,
    };
    sendMessage('project-message', messageObject);
    setMessages((prev) => [...prev, { ...messageObject, outgoing: true }]);
    setMessage('');
  }

  function formatAIResponseToMarkdown(aiResponse) {

    let obj = aiResponse;
    console.log(obj);
    if (typeof aiResponse === 'string') {
      try {
        obj = JSON.parse(aiResponse);
      } catch {
        // Not JSON, treat as plain text (not code)
        return { text: aiResponse, code: null };
      }
    }
    
    const code = obj.function || obj.code || obj.functions || '';
    const text = obj.text || '';
    return { text, code: code ? `\u0060\u0060\u0060js\n${code}\n\u0060\u0060\u0060` : null };
  }

  useEffect(() => {
    initializeSocket(project._id);

    if(!webContainer){
      getWebContainer().then(container=>{
        setWebContainer(container)
        console.log("container started");
      })
    }

    receiveMessage('project-message', (data) => {
      console.log(JSON.parse(data.message));
      const message = JSON.parse(data.message);
      webContainer.mount(message.fileTree);
      if(message.fileTree){
        setFileTree(message.fileTree);
      }
      setMessages((prev) => [...prev, { ...data, outgoing: false }]);
    });
//...
    axios.get(`/projects/get-project/${location.state.proj._id}`).then((res) => {
      setProject(res.data.project);
    });

    axios
      .get('/users/all')
      .then((res) => {
        setUsers(res.data.users);
      })
      .catch((err) => {
        console.log(err);
      });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <main className="h-screen w-screen flex">
      <section className="left relative flex flex-col h-full min-w-80 sm:min-w-96 bg-purple-200">
        <header className="flex justify-between p-2 px-4 w-full bg-purple-400">
          <button className="flex justify-center items-center" onClick={() => setModalOpen(true)}>
            <i className="ri-add-fill text-2xl mr-1"></i>
            <p className="text-sm">Add Collaborators</p>
          </button>
          <button onClick={() => setSidePanelOpen(!sidePanelOpen)} className="p-2">
            <i className="ri-group-2-fill text-2xl"></i>
          </button>
        </header>

        <div className="conversation-area flex-grow flex flex-col gap-4 p-4 overflow-auto max-h-full">
          <div
            ref={messageBox}
            className="message-box flex-grow flex flex-col gap-4 overflow-y-auto"
            style={{ maxHeight: '100%', overflowY: 'auto' }}
          >
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={
                  msg.sender && msg.sender._id === 'ai'
                    ? 'incoming message flex flex-col bg-cyan-950 p-3 rounded-lg shadow-md max-w-xs'
                    : msg.outgoing
                    ? 'outgoing message flex flex-col bg-purple-300 p-3 rounded-lg shadow-md max-w-xs self-end'
                    : 'incoming message flex flex-col bg-teal-100 p-3 rounded-lg shadow-md max-w-xs self-start'
                }
              >
                <small
                  className={
                    msg.sender && msg.sender._id === 'ai'
                      ? 'text-teal-500 font-semibold mb-1 text-xs'
                      : msg.outgoing
                      ? 'text-purple-500 font-semibold mb-1 text-xs text-right'
                      : 'text-teal-500 font-semibold mb-1 text-xs'
                  }
                >
                  {msg.sender && msg.sender._id === 'ai'
                    ? 'AI'
                    : msg.outgoing
                    ? 'You'
                    : msg.sender?.email}
                </small>
                <div className="text-sm text-gray-900 break-words overflow-auto">
                  {msg.sender && msg.sender._id === 'ai' ? (
                    (() => {
                      const { text, code } = formatAIResponseToMarkdown(msg.message);
                      return (
                        <div className="text-white max-w-96">
                          {text && <div className="mb-2 whitespace-pre-line">{text}</div>}
                          {code && (
                            <div className="markdown over">
                              <Markdown options={{ overrides: { code: SyntaxHighlightedCode } }}>{code}</Markdown>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  ) : (
                    msg.message
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="input-field w-full flex">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              type="text"
              placeholder="Enter your message..."
              className="p-2 px-4 pr-24 border-0 outline-none border-purple-400"
              onKeyDown={e => { if (e.key === 'Enter') send(); }}
            />
            <button onClick={send} className="flex-grow p-2 px-4 bg-purple-400">
              <i className="ri-send-plane-fill"></i>
            </button>
          </div>
        </div>

        <div
          className={`side-panel flex flex-col gap-2 w-full h-full absolute left-0 bg-purple-100 top-0 transform transition-transform duration-300 ${
            sidePanelOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <header className="flex justify-between items-center p-2 px-4 w-full bg-purple-100">
            <h1 className="text-lg font-semibold text-purple-700">Collaborators</h1>
            <button onClick={() => setSidePanelOpen(false)} className="p-2">
              <i className="ri-close-circle-fill text-2xl"></i>
            </button>
          </header>

          <div className="users flex flex-col gap-2">
            {project.users &&
              project.users.map((user) => (
                <div
                  key={user._id}
                  className="user-tile flex gap-3 items-center cursor-pointer hover:bg-purple-200 p-2"
                >
                  <div className="aspect-square rounded-full ml-2 p-6 flex items-center justify-center w-fit h-fit bg-purple-300">
                    <i className="ri-user-fill text-2xl absolute"></i>
                  </div>
                  <h1 className="font-semibold text-lg">{user.email}</h1>
                </div>
              ))}
          </div>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md mx-auto p-6 relative">
              <button
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
                onClick={() => setModalOpen(false)}
              >
                <i className="ri-close-line text-2xl"></i>
              </button>
              <h2 className="text-xl font-semibold mb-4 text-purple-700">Select a User</h2>
              <ul className="flex flex-col gap-2 mb-16 max-h-80 overflow-y-auto">
                {users.map((user) => (
                  <li
                    key={user._id}
                    className={`flex items-center gap-3 p-3 rounded cursor-pointer hover:bg-purple-100 transition ${
                      selectedUserIds.includes(user._id) ? 'bg-purple-200' : ''
                    }`}
                    onClick={() => handleUserSelect(user._id)}
                  >
                    <div className="rounded-full bg-purple-300 w-10 h-10 flex items-center justify-center">
                      <i className="ri-user-fill text-lg"></i>
                    </div>
                    <div>
                      <div className="font-medium">{user.email}</div>
                    </div>
                    {selectedUserIds.includes(user._id) && (
                      <i className="ri-checkbox-circle-fill text-purple-600 ml-auto"></i>
                    )}
                  </li>
                ))}
              </ul>
              <button
                className="absolute left-0 bottom-0 w-full bg-purple-500 text-white font-semibold py-3 rounded-b-lg hover:bg-purple-600 transition"
                onClick={addCollaborators}
              >
                Add Collaborators
              </button>
            </div>
          </div>
        )}
      </section>

      <section className='right bg-red-100 flex flex-grow h-full'>
        <div className="explorer h-full max-w-64 min-w-52 bg-slate-500">
          <div className="fileTree w-full">
            {
              Object.keys(fileTree).map((file, idx)=>(
                <button key={idx} onClick={() => {
                                        setCurrentFile(file)
                                        setOpenFiles([ ...new Set([ ...openFiles, file ]) ])
                                    }} className='tree-element cursor-pointer flex gap-2 items-center p-2 bg-slate-600 w-full'>
                  
                  <p className='font-semibold text-base w-full'>{file}</p>
                </button>
              ))


              
            }
          </div>
        </div>
         
          <div className="code-editor flex flex-col flex-grow h-full">
            <div className="top flex justify-between w-full">

              <div className="files flex">
                {openFiles.map((file, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentFile(file)}
                    className={`open-file cursor-pointer p-2 px-4 flex items-center w-fit gap-2 bg-slate-300 ${currentFile === file ? 'bg-slate-400' : ''}`}
                  >
                    <p className='font-semibold text-lg'>{file}</p>
                  </button>
                ))}
              </div>

              <div className="actions flex gap-2">
                <button onClick={async ()=>{
                  const lsProcess = await webContainer?.spawn('ls')
                  await webContainer?.mount(fileTree)
                  lsProcess.output.pipeTo(new WritableStream({
                    write(chunk){
                      console.log(chunk);
                    }
                  }))
                }}>ls</button>
              </div>
            </div>
            <div className="bottom h-full flex flex-grow">
              {fileTree[currentFile] && (
                <div className="w-full h-full">
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
                      setFileTree({
                        ...fileTree,
                        [currentFile]: {
                          file: {
                            contents: value || ''
                          }
                        }
                      });
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        
        
      </section>
    </main>
  );
};

export default Project;
