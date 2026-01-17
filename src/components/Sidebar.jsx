// Chat sidebar component for displaying conversation history
// Manages conversations list, editing, deletion, and navigation
'use client';

import { useState, useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useParams, usePathname, useSearchParams, useRouter } from 'next/navigation';
import { 
    FaComments, 
    FaChevronRight,
    FaChevronDown,
    FaTrash,
    FaEdit,
    FaEllipsisV,
    FaPlus,
    FaStar,
    FaSync,
    FaExclamationTriangle
} from 'react-icons/fa';
import { 
    getConversations, 
    deleteConversation, 
    updateConversation,
    getImportantMessages,
    clearChat
} from '@/lib/store/users-panel/chat/chatSlice';
import { format, isValid, isToday, isYesterday } from 'date-fns';

// Enhanced CSS for sidebar scrollbar
const sidebarScrollbarStyles = `
  /* Modern scrollbar for sidebar - always visible */
  .sidebar-scrollbar {
    scrollbar-width: thin !important;
    scrollbar-color: rgba(156, 163, 175, 0.6) rgba(0, 0, 0, 0.1) !important;
  }
  
  .sidebar-scrollbar::-webkit-scrollbar {
    width: 10px !important;
    -webkit-appearance: none;
  }
  
  .sidebar-scrollbar::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0.1) !important;
    border-radius: 5px;
    -webkit-box-shadow: inset 0 0 1px rgba(0,0,0,0.1);
  }
  
  .sidebar-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(156, 163, 175, 0.6) !important;
    border-radius: 5px;
    transition: background 0.2s ease;
    -webkit-box-shadow: inset 0 0 1px rgba(0,0,0,0.1);
  }
  
  .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(156, 163, 175, 0.8) !important;
  }
  
  .dark .sidebar-scrollbar {
    scrollbar-color: rgba(75, 85, 99, 0.4) rgba(255, 255, 255, 0.05) !important;
  }
  
  .dark .sidebar-scrollbar::-webkit-scrollbar-track {
    background: rgba(255, 255, 255, 0.05) !important;
  }
  
  .dark .sidebar-scrollbar::-webkit-scrollbar-thumb {
    background: rgba(75, 85, 99, 0.4) !important;
  }
  
  .dark .sidebar-scrollbar::-webkit-scrollbar-thumb:hover {
    background: rgba(75, 85, 99, 0.6) !important;
  }
`;

const Sidebar = ({ onClose }) => {
    const [isExpanded, setIsExpanded] = useState(true);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [editingId, setEditingId] = useState(null);
    const [editTitle, setEditTitle] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [conversationToDelete, setConversationToDelete] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef(null);
    const editInputRef = useRef(null);
    const lastRefreshTimeRef = useRef(0);
    const refreshDebounceRef = useRef(null);

    const dispatch = useDispatch();
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const params = useParams();
    const projectId = params?.projectId;
    const currentConversationId = searchParams.get('conversationId');

    const { 
        conversations = [], 
        conversationsStatus,
        importantMessages = [],
        importantMessagesStatus,
        status: chatStatus,
        conversationId: reduxConversationId,
        deleteStatus
    } = useSelector((state) => state.chat);

    // Debug logging
    useEffect(() => {
        console.log('=== SIDEBAR DEBUG ===');
        console.log('Project ID:', projectId);
        console.log('Conversations Status:', conversationsStatus);
        console.log('Conversations Count:', conversations.length);
        console.log('Conversations Data:', conversations);
        console.log('Current URL Conversation ID:', currentConversationId);
        console.log('Delete Status:', deleteStatus);
    }, [projectId, conversationsStatus, conversations, currentConversationId, deleteStatus]);

    // Load conversations when component mounts or projectId changes
    useEffect(() => {
        if (projectId) {
            console.log('🔄 Sidebar: Loading conversations for project:', projectId);
            dispatch(getConversations(projectId));
        }
    }, [projectId, dispatch]);

    // Monitor delete status and refresh conversations when delete is complete
    useEffect(() => {
        if (deleteStatus === 'succeeded') {
            console.log(' Delete successful, refreshing conversations...');
            // Clear any existing debounce timer
            if (refreshDebounceRef.current) {
                clearTimeout(refreshDebounceRef.current);
            }
            // Refresh after a short delay
            refreshDebounceRef.current = setTimeout(() => {
                if (projectId) {
                    dispatch(getConversations(projectId));
                }
            }, 500);
            
            setIsDeleting(false);
        } else if (deleteStatus === 'failed') {
            console.log(' Delete failed');
            setIsDeleting(false);
        }
    }, [deleteStatus, projectId, dispatch]);

    // Load important messages
    useEffect(() => {
        if (projectId) {
            dispatch(getImportantMessages(projectId));
        }
    }, [projectId, dispatch]);

    // Handle click outside to close menus
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    // Focus edit input when editing starts
    useEffect(() => {
        if (editingId && editInputRef.current) {
            editInputRef.current.focus();
            editInputRef.current.select();
        }
    }, [editingId]);

    const handleMenuToggle = (e, conversationId) => {
        e.stopPropagation();
        setOpenMenuId(prevId => (prevId === conversationId ? null : conversationId));
    };

    const handleRefreshConversations = () => {
        if (projectId) {
            console.log('🔄 Manually refreshing conversations');
            dispatch(getConversations(projectId));
        }
    };

    const handleConversationClick = (conversationId) => {
        // Use replace instead of push to avoid adding to history and prevent back/forward issues
        router.replace(`/user/${projectId}/chat?conversationId=${conversationId}`);
        
        // Close sidebar on mobile after selection
        if (onClose && typeof window !== 'undefined' && window.innerWidth < 1024) {
            onClose();
        }
    };

const handleNewChat = async () => {
  if (!projectId) return;

  // 1️⃣ Clear chat state
  dispatch(clearChat());

  // 2️⃣ Force sidebar refresh BEFORE navigation
  await dispatch(getConversations(projectId));

  // 3️⃣ Navigate to new chat
  router.replace(`/user/${projectId}/chat?new=1&t=${Date.now()}`);

  // 4️⃣ Close sidebar on mobile
  if (onClose && typeof window !== 'undefined' && window.innerWidth < 1024) {
    onClose();
  }
};


    const handleEditStart = (e, conversation) => {
        e.stopPropagation();
        setEditingId(conversation.id);
        setEditTitle(conversation.title || '');
        setOpenMenuId(null);
    };

    const handleEditSave = async (e) => {
        e.stopPropagation();
        if (editTitle.trim() && editingId) {
            const result = await dispatch(updateConversation({ 
                conversationId: editingId, 
                title: editTitle.trim() 
            }));
            
            if (updateConversation.fulfilled.match(result)) {
                setEditingId(null);
                setEditTitle('');
                // Refresh conversations after successful edit
                if (projectId) {
                    setTimeout(() => dispatch(getConversations(projectId)), 300);
                }
            }
        }
    };

    const handleEditCancel = (e) => {
        e.stopPropagation();
        setEditingId(null);
        setEditTitle('');
    };

    const handleEditKeyPress = (e) => {
        if (e.key === 'Enter') {
            handleEditSave(e);
        } else if (e.key === 'Escape') {
            handleEditCancel(e);
        }
    };

    const handleDeleteClick = (e, conversation) => {
        e.stopPropagation();
        setConversationToDelete(conversation);
        setIsModalOpen(true);
        setOpenMenuId(null);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setConversationToDelete(null);
        setIsDeleting(false);
    };

    const handleConfirmDelete = async () => {
  if (!conversationToDelete || !projectId) return;

  const deletedId = conversationToDelete.id;
  const isCurrentConversation = currentConversationId === deletedId;

  try {
    setIsDeleting(true);

    // 1️⃣ Delete from backend + Redux
    await dispatch(deleteConversation(deletedId)).unwrap();

    // 2️⃣ 🔥 FORCE sidebar refresh (THIS LINE YOU ARE ASKING ABOUT)
    await dispatch(getConversations(projectId));

    // 3️⃣ If deleted chat was open, redirect
    if (isCurrentConversation) {
      dispatch(clearChat());
      router.replace(`/user/${projectId}/chat?new=1`);
    }

    handleCloseModal();
  } catch (err) {
    console.error("Delete failed:", err);
  } finally {
    setIsDeleting(false);
  }
};



    const handleMarkImportant = async (e, conversation) => {
        e.stopPropagation();
        setOpenMenuId(null);
        // Note: This would need backend support for conversation-level importance
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (!isValid(date)) return '';
        return format(date, 'MMM d, h:mm a');
    };

    const formatDateHeader = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (!isValid(date)) return '';
        
        if (isToday(date)) {
            return 'Today';
        } else if (isYesterday(date)) {
            return 'Yesterday';
        } else {
            return format(date, 'MMM d, yyyy');
        }
    };

    const groupConversationsByDate = (conversations) => {
        if (!conversations || conversations.length === 0) return {};
        
        // Filter out deleted conversations (backend should filter, but double-check)
        const activeConversations = conversations.filter(conv => {
            const isArchived = conv.is_archived === true || conv.is_archived === 1 || conv.is_archived === '1';
            const isDeleted = conv.status === 'deleted';
            return !isDeleted && !isArchived;
        });
        
        if (activeConversations.length === 0) return {};
        
        // Deduplicate conversations by ID
        const conversationMap = new Map();
        activeConversations.forEach(conv => {
            if (conv.id && !conversationMap.has(conv.id)) {
                conversationMap.set(conv.id, conv);
            }
        });
        
        const deduplicatedConversations = Array.from(conversationMap.values());
        
        // Sort by updated_at or created_at (most recent first)
        const sortedConversations = [...deduplicatedConversations].sort((a, b) => {
            const dateA = new Date(a.updated_at || a.created_at || 0);
            const dateB = new Date(b.updated_at || b.created_at || 0);
            return dateB - dateA;
        });

        // Group by date
        const grouped = {};
        sortedConversations.forEach(conversation => {
            const dateHeader = formatDateHeader(conversation.updated_at || conversation.created_at);
            if (!grouped[dateHeader]) {
                grouped[dateHeader] = [];
            }
            if (!grouped[dateHeader].some(c => c.id === conversation.id)) {
                grouped[dateHeader].push(conversation);
            }
        });

        return grouped;
    };

    const isConversationImportant = (conversationId) => {
        if (!conversationId || !importantMessages || importantMessages.length === 0) return false;
        return importantMessages.some(msg => {
            const msgConvId = msg.conversation_id || msg.conversationId;
            return String(msgConvId) === String(conversationId);
        });
    };

    const groupedConversations = groupConversationsByDate(conversations);
    const hasConversations = Object.keys(groupedConversations).length > 0;

    return (
        <aside className={`${isExpanded ? 'w-80' : 'w-16'} transition-all duration-300 flex-shrink-0 h-full`}>
            <style dangerouslySetInnerHTML={{ __html: sidebarScrollbarStyles }} />
            <div className="h-full bg-white dark:bg-gray-900/50 border-r border-gray-200 dark:border-gray-800/30 flex flex-col w-full">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-800/30">
                    <div className="flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                        {isExpanded && (
                            <div className="flex items-center justify-between w-full">
                                <div>
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                                        Chat History
                                    </h2>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        {conversations.length} conversations
                                        {conversationsStatus === 'loading' && ' (loading...)'}
                                        {isDeleting && ' (deleting...)'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleRefreshConversations}
                                        disabled={conversationsStatus === 'loading' || isDeleting}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors disabled:opacity-50"
                                        title="Refresh conversations"
                                    >
                                        <FaSync className={`w-4 h-4 text-gray-600 dark:text-gray-400 ${conversationsStatus === 'loading' ? 'animate-spin' : ''}`} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setIsExpanded(!isExpanded);
                                        }}
                                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors"
                                    >
                                        {isExpanded ? (
                                            <FaChevronDown className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        ) : (
                                            <FaChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                        {!isExpanded && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsExpanded(!isExpanded);
                                    }}
                                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/40 transition-colors"
                                >
                                    <FaChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat History Section */}
                {isExpanded && (
                    <div className="flex-1 flex flex-col">
                        {/* New Chat Button */}
                        <div className="p-4 border-b border-gray-200 dark:border-gray-800/30">
                            <button
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleNewChat();
                                }}
                                disabled={!projectId || isDeleting}
                                className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                                    projectId && !isDeleting
                                        ? 'bg-gradient-to-r from-blue-500 to-blue-700 hover:from-blue-600 hover:to-blue-800 text-white cursor-pointer' 
                                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                }`}
                            >
                                <FaPlus className="w-4 h-4" />
                                New Chat
                            </button>
                        </div>

                        {/* Conversations List */}
                        <div className="flex-1 sidebar-scrollbar" style={{ 
                            scrollbarWidth: 'thin',
                            scrollbarColor: 'rgba(156, 163, 175, 0.6) rgba(0, 0, 0, 0.1)',
                            overflowY: 'scroll',
                            maxHeight: 'calc(100vh - 200px)',
                            minHeight: '400px'
                        }}>
                            {conversationsStatus === 'loading' ? (
                                <div className="p-8 text-center">
                                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                                    <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">Loading conversations...</p>
                                </div>
                            ) : !hasConversations ? (
                                <div className="p-8 text-center">
                                    <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                                        <FaComments className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                                    </div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">No conversations yet</p>
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Start a new chat to begin</p>
                                </div>
                            ) : (
                                <div className="p-2">
                                    {Object.entries(groupedConversations).map(([dateHeader, dateConversations]) => (
                                        <div key={dateHeader} className="mb-4">
                                            {/* Date Header */}
                                            <div className="px-3 py-2 mb-2">
                                                <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                                                    {dateHeader}
                                                </h4>
                                            </div>
                                            
                                            {/* Conversations for this date */}
                                            <div className="space-y-1">
                                                {dateConversations.map((conversation) => {
                                                    const isActive = currentConversationId === conversation.id;
                                                    const isImportant = isConversationImportant(conversation.id);
                                                    
                                                    return (
                                                        <div
                                                            key={conversation.id}
                                                            className={`group relative rounded-lg transition-all duration-200 ${
                                                                isActive
                                                                    ? 'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800/30'
                                                                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                                                            }`}
                                                        >
                                                            <div
                                                                className="flex items-center gap-3 p-3 cursor-pointer"
                                                                onClick={() => !isDeleting && handleConversationClick(conversation.id)}
                                                            >
                                                                <FaComments className={`w-4 h-4 flex-shrink-0 ${
                                                                    isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'
                                                                }`} />
                                                                
                                                                <div className="flex-1 min-w-0">
                                                                    {editingId === conversation.id ? (
                                                                        <input
                                                                            ref={editInputRef}
                                                                            type="text"
                                                                            value={editTitle}
                                                                            onChange={(e) => setEditTitle(e.target.value)}
                                                                            onKeyDown={handleEditKeyPress}
                                                                            onBlur={handleEditSave}
                                                                            className="w-full text-sm font-medium bg-transparent border-none outline-none text-gray-900 dark:text-white"
                                                                            onClick={(e) => e.stopPropagation()}
                                                                        />
                                                                    ) : (
                                                                        <div className="flex items-center gap-2">
                                                                            <h3 className={`text-sm font-medium truncate ${
                                                                                isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-white'
                                                                            }`}>
                                                                                {conversation.title || 'Untitled Chat'}
                                                                            </h3>
                                                                            {isImportant && (
                                                                                <FaStar className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                            {formatDate(conversation.created_at)}
                                                                        </p>
                                                                        <span className="text-xs text-gray-400 dark:text-gray-500">•</span>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                            {conversation.message_count || 0} messages
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                
                                                                {!isDeleting && (
                                                                    <div className="flex items-center gap-1">
                                                                        <button
                                                                            onClick={(e) => handleMenuToggle(e, conversation.id)}
                                                                            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700/50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                        >
                                                                            <FaEllipsisV className="w-3 h-3 text-gray-500" />
                                                                        </button>
                                                                        
                                                                        {/* Dropdown Menu */}
                                                                        {openMenuId === conversation.id && (
                                                                            <div
                                                                                ref={menuRef}
                                                                                className="absolute right-2 top-full mt-1 w-48 bg-white dark:bg-gray-900/80 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800/30 z-50"
                                                                            >
                                                                                <ul className="py-1">
                                                                                    <li>
                                                                                        <button
                                                                                            onClick={(e) => handleEditStart(e, conversation)}
                                                                                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/40"
                                                                                        >
                                                                                            <FaEdit className="w-3 h-3" />
                                                                                            Rename
                                                                                        </button>
                                                                                    </li>
                                                                                    <li>
                                                                                        <button
                                                                                            onClick={(e) => handleMarkImportant(e, conversation)}
                                                                                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800/40"
                                                                                        >
                                                                                            <FaStar className="w-3 h-3" />
                                                                                            {isImportant ? 'Remove from Important' : 'Mark as Important'}
                                                                                        </button>
                                                                                    </li>
                                                                                    <li>
                                                                                        <button
                                                                                            onClick={(e) => handleDeleteClick(e, conversation)}
                                                                                            className="w-full text-left px-4 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-gray-800/40"
                                                                                        >
                                                                                            <FaTrash className="w-3 h-3" />
                                                                                            Delete
                                                                                        </button>
                                                                                    </li>
                                                                                </ul>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Footer */}
                {isExpanded && (
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800/30">
                        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            SchemaX AI Assistant
                        </div>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white dark:bg-gray-900/80 rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                            Delete Conversation
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">
                            Are you sure you want to delete "{conversationToDelete?.title || 'Untitled Chat'}"? 
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleCloseModal}
                                disabled={isDeleting}
                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleConfirmDelete}
                                disabled={isDeleting}
                                className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                                    isDeleting
                                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        : 'bg-red-600 hover:bg-red-700 text-white'
                                }`}
                            >
                                {isDeleting ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;