// User dashboard page component
// Displays user's projects with options to create, view, edit, and delete projects
'use client';

import { useEffect, useState, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { getProjects, deleteProject, getDashboardStats } from '@/lib/store/users-panel/projects/projectSlice';
import { FaPlus, FaFolderPlus, FaProjectDiagram, FaExclamationTriangle, FaEllipsisV, FaPencilAlt, FaTrash, FaEye, FaDatabase, FaComments, FaChartLine } from 'react-icons/fa';
import DeleteConfirmationModal from '@/components/users/modals/DeleteConfirmationModal';

// Enhanced CSS for modern LLM-like interface
const modernLLMStyles = `
  @keyframes shimmer {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(100%);
    }
  }

  .animate-shimmer {
    animation: shimmer 2s infinite;
  }

  @keyframes fade-in {
    from {
      opacity: 0;
      transform: translateY(10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .animate-fade-in {
    animation: fade-in 0.3s ease-out;
  }

  @keyframes typing {
    0%, 60%, 100% {
      transform: translateY(0);
      opacity: 0.4;
    }
    30% {
      transform: translateY(-8px);
      opacity: 1;
    }
  }

  /* Modern scrollbar - always visible */
  .custom-scrollbar::-webkit-scrollbar {
    width: 8px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.05);
    border-radius: 4px;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.4);
    border-radius: 4px;
    transition: background 0.2s ease;
  }
  
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.6);
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05);
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.4);
  }
  
  .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.6);
  }

  /* Card hover effects */
  .card-hover {
    transition: all 0.2s ease;
  }

  .card-hover:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  }

  .dark .card-hover:hover {
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  }

  /* Smooth transitions */
  .stat-card {
    transition: all 0.2s ease;
  }

  .stat-card:hover {
    transform: translateY(-2px);
  }

  /* Modern button styles */
  .modern-button {
    transition: all 0.2s ease;
  }

  .modern-button:hover:not(:disabled) {
    transform: scale(1.02);
  }

  .modern-button:active {
    transform: scale(0.98);
  }
`;

const LoadingSkeleton = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 animate-pulse">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl p-6 h-40 
                                  bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <div className="h-5 rounded w-3/4 mb-3
                                bg-gray-200 dark:bg-gray-700"></div>
                <div className="h-4 rounded w-1/2
                                bg-gray-200 dark:bg-gray-700"></div>
            </div>
        ))}
    </div>
);

const ErrorState = ({ message }) => (
    <div className="rounded-2xl p-8 border border-dashed text-center flex flex-col items-center justify-center h-96
                   bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4
                       bg-red-50 dark:bg-red-500/10">
            <FaExclamationTriangle className="text-2xl text-red-500 dark:text-red-400" />
        </div>
        <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Something Went Wrong</h3>
        <p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
            {message || "We couldn't load your projects. Please try again later."}
        </p>
    </div>
);


const DashboardPage = () => {
    const dispatch = useDispatch();
    const router = useRouter();
    const [openMenuId, setOpenMenuId] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const menuRefs = useRef({});
    
    const { projects = [], status, message, stats, statsStatus } = useSelector((state) => state.projects);
    const deleteStatus = useSelector((state) => state.projects.status);

    useEffect(() => {
        if (status === 'idle') {
            dispatch(getProjects());
        }
        if (statsStatus === 'idle') {
            dispatch(getDashboardStats());
        }
    }, [status, statsStatus, dispatch]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside any open menu
            if (openMenuId) {
                const menuElement = menuRefs.current[openMenuId];
                if (menuElement && !menuElement.contains(event.target)) {
                    // Check if click is not on the menu toggle button
                    const toggleButton = event.target.closest('[data-menu-toggle]');
                    if (!toggleButton) {
                        setOpenMenuId(null);
                    }
                }
            }
        };
        if (openMenuId) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [openMenuId]);

    const handleMenuToggle = (e, projectId) => {
        e.stopPropagation();
        setOpenMenuId(prevId => (prevId === projectId ? null : projectId));
    };

    const handleEdit = (e, projectId) => {
        e.stopPropagation();
        router.push(`/user/project/${projectId}/edit`);
    };

    const handleDeleteClick = (e, project) => {
        e.stopPropagation();
        setProjectToDelete(project);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setProjectToDelete(null);
    };

    const handleConfirmDelete = async () => {
        if (projectToDelete) {
            const result = await dispatch(deleteProject(projectToDelete.id));
            if (deleteProject.fulfilled.match(result)) {
                // Refresh stats after deletion
                dispatch(getDashboardStats());
            }
        }
        handleCloseModal();
    };

    const renderContent = () => {
        if (status === 'loading' || status === 'idle') {
            return <LoadingSkeleton />;
        }

        if (status === 'failed') {
            return <ErrorState message={message} />;
        }

        if (status === 'succeeded' && projects && projects.length > 0) {
            return (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {projects.map((project) => (
                        <div
                            key={project.id}
                            className="relative bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm card-hover group animate-fade-in"
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center flex-1 min-w-0">
                                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl mr-3 flex-shrink-0">
                                            <FaProjectDiagram className="text-blue-600 dark:text-blue-400 text-base" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1 truncate">{project.name}</h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                {project.project_info || "No description provided."}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => handleMenuToggle(e, project.id)}
                                        data-menu-toggle
                                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                                        title="Options"
                                    >
                                        <FaEllipsisV className="w-4 h-4" />
                                    </button>
                                </div>
                                
                                {openMenuId === project.id && (
                                    <div ref={(el) => { menuRefs.current[project.id] = el; }} className="absolute top-14 right-4 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-20">
                                        <ul className="py-1">
                                            <li>
                                                <button 
                                                    onClick={() => router.push(`/user/${project.id}/chat`)} 
                                                    className="w-full text-left px-4 py-2 text-sm flex items-center text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors"
                                                >
                                                    <FaEye className="mr-3 w-3.5 h-3.5" /> View Project
                                                </button>
                                            </li>
                                            <li>
                                                <button 
                                                    onClick={(e) => handleEdit(e, project.id)} 
                                                    className="w-full text-left px-4 py-2 text-sm flex items-center text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700/50 transition-colors"
                                                >
                                                    <FaPencilAlt className="mr-3 w-3.5 h-3.5" /> Edit Project
                                                </button>
                                            </li>
                                            <li>
                                                <button 
                                                    onClick={(e) => handleDeleteClick(e, project)} 
                                                    className="w-full text-left px-4 py-2 text-sm flex items-center text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-700/50 transition-colors"
                                                >
                                                    <FaTrash className="mr-3 w-3.5 h-3.5" /> Delete Project
                                                </button>
                                            </li>
                                        </ul>
                                    </div>
                                )}
                                
                                <button
                                    onClick={() => router.push(`/user/${project.id}/chat`)}
                                    className="w-full mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-xl transition-all duration-200 shadow-sm modern-button"
                                >
                                    Open Project
                                </button>
                            </div>
                        </div>
                    ))}
                    <button
                        onClick={() => router.push('/user/project/add')}
                        className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200 flex flex-col items-center justify-center p-8 group card-hover"
                        title="Create a new project"
                    >
                        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl mb-3 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 transition-colors">
                            <FaPlus className="text-xl text-gray-500 dark:text-gray-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                        </div>
                        <span className="font-medium text-sm text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">New Project</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Create a new AI database project</span>
                    </button>
                </div>
            );
        }

        return (
            <div className="rounded-2xl p-8 border border-dashed text-center flex flex-col items-center justify-center h-96
                           bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4
                               bg-gray-50 dark:bg-gray-700/50">
                    <FaFolderPlus className="text-blue-500 dark:text-blue-400 text-2xl" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">No Projects Found</h3>
                <p className="mb-6 max-w-sm text-sm text-gray-600 dark:text-gray-400">
                    Get started by creating your first project.
                </p>
                <button
                    onClick={() => router.push('/user/project/add')}
                    className="bg-blue-500 cursor-pointer hover:bg-blue-600 text-white font-medium py-2.5 px-5 rounded-xl flex items-center transition-all duration-200 shadow-sm modern-button"
                >
                    <FaPlus className="mr-2 w-4 h-4" />
                    Create New Project
                </button>
            </div>
        );
    };

    return (
        <div className="w-full h-full flex flex-col p-4 sm:p-6 bg-gray-50 dark:bg-gray-950 custom-scrollbar">
            <style dangerouslySetInnerHTML={{ __html: modernLLMStyles }} />
            {/* Header */}
            <div className="mb-6 sm:mb-8">
                <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white mb-2">Dashboard</h1>
                <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Manage your AI database projects and conversations</p>
            </div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm stat-card animate-fade-in">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Projects</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {statsStatus === 'loading' ? '...' : (stats?.projects ?? projects.length)}
                            </p>
                        </div>
                        <div className="p-2.5 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
                            <FaProjectDiagram className="text-blue-600 dark:text-blue-400 text-lg" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm stat-card animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Databases</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {statsStatus === 'loading' ? '...' : (stats?.databases ?? projects.length)}
                            </p>
                        </div>
                        <div className="p-2.5 bg-green-50 dark:bg-green-900/20 rounded-xl">
                            <FaDatabase className="text-green-600 dark:text-green-400 text-lg" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm stat-card animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Conversations</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {statsStatus === 'loading' ? '...' : (stats?.conversations ?? 0)}
                            </p>
                        </div>
                        <div className="p-2.5 bg-purple-50 dark:bg-purple-900/20 rounded-xl">
                            <FaComments className="text-purple-600 dark:text-purple-400 text-lg" />
                        </div>
                    </div>
                </div>
                
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm stat-card animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Queries</p>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {statsStatus === 'loading' ? '...' : (stats?.queries ?? 0)}
                            </p>
                        </div>
                        <div className="p-2.5 bg-orange-50 dark:bg-orange-900/20 rounded-xl">
                            <FaChartLine className="text-orange-600 dark:text-orange-400 text-lg" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Projects Section */}
            <div className="flex-1">
                <div className="mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">Your Projects</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Create and manage your AI database projects</p>
                </div>
                
                <DeleteConfirmationModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onConfirm={handleConfirmDelete}
                    title="Delete Project"
                    message={`Are you sure you want to permanently delete the project "${projectToDelete?.name}"? This action cannot be undone.`}
                    isLoading={deleteStatus === 'loading'}
                />
                {renderContent()}
            </div>
        </div>
    );
}

export default DashboardPage;