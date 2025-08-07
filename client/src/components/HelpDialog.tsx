import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { HelpCircle, Clock, MapPin, Train, Package, DollarSign, Calendar, LogOut, RotateCcw, AlertTriangle, Eye, Settings, Calculator, BookOpen, Search, History, Bot, Send, Loader2, ChevronDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface HelpDialogProps {
  children?: React.ReactNode;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  provider?: string;
}

interface AIProvider {
  id: string;
  name: string;
  available: boolean;
  description: string;
}

export function HelpDialog({ children }: HelpDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("auto");
  const [availableProviders, setAvailableProviders] = useState<AIProvider[]>([
    { id: 'auto', name: 'Auto-detect', available: true, description: 'Automatically use available provider' }
  ]);
  const [providersLoaded, setProvidersLoaded] = useState(false);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to highlight search matches
  const highlightMatch = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? 
        <mark key={index} className="bg-yellow-200 px-1 rounded">{part}</mark> : 
        part
    );
  };

  // Comprehensive keyword mapping for smart search
  const searchKeywordMap = {
    // Core Actions & Navigation
    'add': ['create', 'new', 'insert', 'register', 'setup'],
    'edit': ['change', 'modify', 'update', 'alter', 'adjust'],
    'delete': ['remove', 'destroy', 'erase', 'eliminate'],
    'settings': ['config', 'configuration', 'setup', 'preferences', 'options', 'gear'],
    'help': ['guide', 'manual', 'instructions', 'tutorial', 'documentation'],
    
    // Driver & Fleet Management
    'driver': ['trucker', 'operator', 'employee', 'person', 'worker'],
    'truck': ['vehicle', 'rig', 'semi', 'trailer', 'equipment'],
    'dispatcher': ['operator', 'manager', 'coordinator', 'controller'],
    'team': ['group', 'crew', 'unit', 'squad', 'division'],
    'fleet': ['trucks', 'vehicles', 'drivers', 'operation'],
    
    // Detention & Time Management
    'detention': ['delay', 'wait', 'holding', 'stuck', 'late', 'overtime'],
    'appointment': ['arrival', 'schedule', 'time', 'eta', 'pickup', 'delivery'],
    'departure': ['leave', 'finish', 'done', 'complete', 'exit'],
    'timer': ['clock', 'time', 'counter', 'stopwatch'],
    'stop': ['location', 'destination', 'site', 'facility', 'customer'],
    
    // Money & Billing
    'cost': ['price', 'rate', 'charge', 'fee', 'billing', 'money', 'dollar'],
    'pay': ['payment', 'compensation', 'salary', 'wage', 'income'],
    'calculate': ['compute', 'figure', 'determine', 'math', 'total'],
    'fsc': ['fuel', 'surcharge', 'percentage', 'fuel surcharge'],
    
    // Stop Types
    'regular': ['normal', 'standard', 'default', 'typical'],
    'multistop': ['multi-stop', 'multiple', 'several stops'],
    'rail': ['railroad', 'train', 'railway'],
    'drop': ['drop-hook', 'hook', 'trailer drop'],
    'nobilling': ['no-billing', 'free', 'no charge'],
    
    // Status & Alerts
    'alert': ['notification', 'warning', 'reminder', 'notice', 'message'],
    'warning': ['caution', 'alert', 'notice'],
    'critical': ['urgent', 'important', 'serious', 'priority'],
    'status': ['state', 'condition', 'situation'],
    'active': ['working', 'on duty', 'busy'],
    'standby': ['waiting', 'idle', 'ready', 'available'],
    
    // Tools & Features
    'calculator': ['tool', 'compute', 'math', 'calculation'],
    'filter': ['sort', 'search', 'find', 'organize'],
    'reset': ['clear', 'restart', 'zero', 'clean'],
    'refresh': ['reload', 'update', 'sync'],
    
    // Common Questions
    'how': ['instructions', 'steps', 'guide', 'tutorial'],
    'what': ['definition', 'explanation', 'meaning'],
    'where': ['location', 'place', 'find'],
    'when': ['time', 'schedule', 'timing'],
    'why': ['reason', 'purpose', 'explanation']
  };

  // Fuzzy matching function for typo tolerance
  const getLevenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Smart search function with ranking and fuzzy matching
  const getSearchRelevance = (content: string, searchTerm: string): number => {
    if (!searchTerm.trim()) return 0;
    
    const searchLower = searchTerm.toLowerCase();
    const contentLower = content.toLowerCase();
    let score = 0;
    
    // Exact phrase match (highest priority)
    if (contentLower.includes(searchLower)) {
      score += 100;
    }
    
    // Individual word matching with synonym support
    const searchWords = searchLower.split(/\s+/).filter(word => word.length > 1);
    const contentWords = contentLower.split(/\W+/).filter(word => word.length > 1);
    
    for (const searchWord of searchWords) {
      // Direct word match
      if (contentWords.some(word => word.includes(searchWord))) {
        score += 20;
      }
      
      // Synonym matching
      const synonyms = (searchKeywordMap as Record<string, string[]>)[searchWord] || [];
      for (const synonym of synonyms) {
        if (contentWords.some(word => word.includes(synonym.toLowerCase()))) {
          score += 15;
        }
      }
      
      // Fuzzy matching for typos (within 2 character difference)
      for (const contentWord of contentWords) {
        if (Math.abs(contentWord.length - searchWord.length) <= 3) {
          const distance = getLevenshteinDistance(searchWord, contentWord);
          if (distance <= 2) {
            score += Math.max(5, 10 - distance * 2);
          }
        }
      }
      
      // Partial word matching
      for (const contentWord of contentWords) {
        if (contentWord.length >= 3 && searchWord.length >= 3) {
          if (contentWord.includes(searchWord) || searchWord.includes(contentWord)) {
            score += 8;
          }
        }
      }
    }
    
    return score;
  };

  // Enhanced search matching with relevance scoring
  const matchesSearch = (content: string) => {
    if (!searchTerm.trim()) return true;
    return getSearchRelevance(content, searchTerm) > 0;
  };

  // Get search suggestions based on partial input
  const getSearchSuggestions = (partial: string): string[] => {
    if (!partial || partial.length < 2) return [];
    
    const suggestions = new Set<string>();
    const partialLower = partial.toLowerCase();
    
    // Add direct keyword matches
    Object.keys(searchKeywordMap).forEach(keyword => {
      if (keyword.includes(partialLower)) {
        suggestions.add(keyword);
      }
      // Add synonyms that match
      ((searchKeywordMap as Record<string, string[]>)[keyword] || []).forEach((synonym: string) => {
        if (synonym.includes(partialLower)) {
          suggestions.add(synonym);
        }
      });
    });
    
    // Add common dispatcher terms
    const commonTerms = [
      'set appointment', 'add driver', 'detention cost', 'stop timer', 
      'calculate pay', 'team management', 'alert history', 'driver status',
      'departure time', 'accessorial guide', 'filter drivers', 'reset driver'
    ];
    
    commonTerms.forEach(term => {
      if (term.toLowerCase().includes(partialLower)) {
        suggestions.add(term);
      }
    });
    
    return Array.from(suggestions).slice(0, 5);
  };

  // Handle search result click to navigate to appropriate tab
  const handleSearchResultClick = (result: { title: string; content: string; category: string; relevance: number }) => {
    // Map category to tab names
    const categoryToTab = {
      'overview': 'overview',
      'detention': 'detention', 
      'actions': 'actions',
      'tools': 'tools'
    };
    
    const targetTab = categoryToTab[result.category as keyof typeof categoryToTab] || 'overview';
    
    // Store the search term for highlighting but clear the search to show tab content
    const searchForHighlighting = searchTerm;
    
    // Clear search immediately so tab content becomes visible
    setSearchTerm('');
    
    // Switch to the appropriate tab immediately
    setActiveTab(targetTab);
    
    // Scroll to relevant content after tab loads
    setTimeout(() => {
      let targetElement: Element | HTMLElement | null = null;
      
      // Strategy 1: Look for headings first (most reliable)
      const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
      Array.from(headings).forEach(heading => {
        const text = heading.textContent?.toLowerCase() || '';
        const titleLower = result.title.toLowerCase();
        
        if (text.includes('accessorial') && result.title.includes('Accessorial') ||
            text.includes('calculator') && result.title.includes('Calculator') ||
            text.includes('stop types') && result.title.includes('Stop Types') ||
            text.includes('team') && result.title.includes('Team') ||
            text.includes('driver management') && result.title.includes('Driver') ||
            text.includes('alert') && result.title.includes('Alert') ||
            text.includes('appointment') && result.title.includes('Appointment') ||
            text.includes('departure') && result.title.includes('Departure')) {
          
          if (!targetElement) {
            targetElement = heading.closest('div') || heading;

          }
        }
      });
      
      // Strategy 2: Look for specific content sections if heading not found
      if (!targetElement) {
        const contentElements = document.querySelectorAll('div, section, p');
        Array.from(contentElements).forEach(element => {
          const text = element.textContent?.toLowerCase() || '';
          
          // More specific matching patterns
          if ((result.title.includes('Accessorial') && text.includes('overweight') && text.includes('hazmat')) ||
              (result.title.includes('Calculator') && text.includes('cost calculator') && text.includes('detention calculator')) ||
              (result.title.includes('Stop Types') && text.includes('regular') && text.includes('multi-stop')) ||
              (result.title.includes('Team') && text.includes('team management') && text.includes('color')) ||
              (result.title.includes('Alert') && text.includes('notification') && text.includes('desktop')) ||
              (result.title.includes('Appointment') && text.includes('blue button') && text.includes('set appointment')) ||
              (result.title.includes('Departure') && text.includes('green button') && text.includes('departure'))) {
            
            if (!targetElement && element.getBoundingClientRect().height > 0) {
              targetElement = element;

            }
          }
        });
      }
      
      // Strategy 3: Fallback - target actual content area, not tab buttons
      if (!targetElement) {
        // Look for content areas, avoiding tab buttons and UI elements
        const contentSelectors = [
          '[role="tabpanel"][data-state="active"] .space-y-4',
          '[role="tabpanel"][data-state="active"] > div',
          '[role="tabpanel"][data-state="active"]',
          '.overflow-y-auto .space-y-4',
          '.overflow-y-auto > div'
        ];
        
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector);
          if (element && element.getBoundingClientRect().height > 0 && 
              !element.closest('[role="tab"]') && // Avoid tab buttons
              !element.closest('[role="tablist"]')) { // Avoid tab bar
            targetElement = element;

            break;
          }
        }
        
        // Last resort - find any visible content div that's not a tab UI element
        if (!targetElement) {
          const allDivs = document.querySelectorAll('div');
          Array.from(allDivs).forEach(div => {
            if (!targetElement && 
                div.getBoundingClientRect().height > 50 && // Must be substantial content
                !div.closest('[role="tab"]') && 
                !div.closest('[role="tablist"]') &&
                !div.classList.contains('border-l-4') && // Not a search result
                div.textContent && div.textContent.length > 100) { // Has substantial text
              targetElement = div;

            }
          });
        }
      }
      
      // Apply highlighting and scrolling
      if (targetElement) {
        // Verify we're not highlighting a tab button or UI element
        if (targetElement.closest('[role="tab"]') || targetElement.closest('[role="tablist"]')) {

          targetElement = targetElement.closest('[role="tabpanel"]') || 
                         document.querySelector('[role="tabpanel"][data-state="active"] .space-y-4') ||
                         document.querySelector('[role="tabpanel"][data-state="active"]');
        }
        
        if (targetElement) {

          
          targetElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
          
          // Enhanced highlight effect with stronger visual impact (only for HTMLElements)
          if (targetElement instanceof HTMLElement) {
            const originalStyle = targetElement.style.cssText;
            targetElement.style.backgroundColor = '#fbbf24'; // More vibrant yellow
            targetElement.style.transition = 'all 0.3s ease';
            targetElement.style.borderRadius = '12px';
            targetElement.style.padding = '12px';
            targetElement.style.border = '2px solid #f59e0b';
            targetElement.style.boxShadow = '0 4px 12px rgba(251, 191, 36, 0.3)';
            
            setTimeout(() => {
              if (targetElement instanceof HTMLElement) {
                targetElement.style.backgroundColor = '#fef3c7'; // Fade to lighter yellow
                targetElement.style.border = '2px solid #fbbf24';
                setTimeout(() => {
                  if (targetElement instanceof HTMLElement) {
                    targetElement.style.cssText = originalStyle;
                  }
                }, 500);
              }
            }, 2000);
          }
        }
      } else {
        // No target element found for highlighting
      }
    }, 400);
  };

  // Dynamic content indexing for comprehensive search
  const getAllSearchableContent = () => {
    return [
      // Overview content
      "Dispatcher Helper fleet management system monitor truck drivers detention times automated alerts appointment-based detention monitoring comprehensive real-time tracking",
      
      // Actions content  
      "set appointment blue button driver row HH:MM format detention tracking departure green button stop timer reset orange button clear data appointment times stop type selection regular multi-stop rail drop hook no billing colored buttons",
      
      // Tools content
      "settings gear icon driver management add edit delete dispatcher management team management cost calculator detention calculator accessorial guide FSC fuel surcharge percentage yard pull dry run overweight hazmat scale fees riverdale joliet storage rates",
      
      // Detention content
      "stop types detention rules regular 2 hours multi-stop 1 hour rail 1 hour drop hook 30 minutes no billing 15 minutes rate 1.25 dollar per minute warning alerts critical alerts reminder alerts team filtering",
      
      // Status definitions
      "standby waiting idle ready available at stop active appointment timer warning approaching detention critical in detention completed finished departed",
      
      // Team management
      "create teams colors assign dispatchers team filtering blue green red orange yellow purple pink indigo gray teal emerald cyan 12 colors available",
      
      // Calculator features
      "cost calculator dual tabs driver FSC no empty yard pull dry run fuel percentage dropdown customer cost driver pay calculations detention calculator stop specific costs per minute",
      
      // Alert system
      "desktop notifications audio alerts toast notifications browser tab flashing team-based filtering universal filtering all notification channels dispatcher selection multi-computer notification system all tabs notify",
      
      // Recent changes and features
      recentChanges.map(change => `${change.title} ${change.items.join(' ')}`).join(' ')
    ].join(' ');
  };

  // Enhanced tab content matching with relevance
  const tabHasMatches = (tabContent: string) => {
    if (!searchTerm.trim()) return true;
    
    // Combine static tab content with dynamic searchable content
    const combinedContent = `${tabContent} ${getAllSearchableContent()}`;
    return getSearchRelevance(combinedContent, searchTerm) > 0;
  };

  // Get ranked search results for display
  const getSearchResults = (): Array<{ title: string; content: string; category: string; relevance: number }> => {
    if (!searchTerm.trim() || searchTerm.length < 2) return [];
    
    const results: Array<{ title: string; content: string; category: string; relevance: number }> = [];
    
    // Define comprehensive content sections with enhanced content
    const contentSections = [
      { 
        title: "Getting Started", 
        content: "add driver set appointment track detention departure time dispatcher helper fleet management system monitor truck drivers tracking alerts notifications real time live countdown timer", 
        category: "overview" 
      },
      { 
        title: "Driver Management", 
        content: "settings gear icon add edit delete driver truck number dispatcher assignment activate deactivate power button status management create remove drivers fleet active inactive", 
        category: "tools" 
      },
      { 
        title: "Appointment Tracking", 
        content: "blue button set appointment HH:MM format detention timer tracking schedule time arrival pickup delivery eta appointment times detention start", 
        category: "actions" 
      },
      { 
        title: "Stop Timer & Departure", 
        content: "green button set departure stop timer calculate detention cost record departure time finish complete done exit leave", 
        category: "actions" 
      },
      { 
        title: "Stop Types & Detention Rules", 
        content: "regular multi-stop rail drop hook no billing detention thresholds 2 hours 1 hour 30 minutes 15 minutes warning critical alerts rate 1.25 dollar per minute", 
        category: "detention" 
      },
      { 
        title: "Cost & Detention Calculators", 
        content: "cost calculator detention calculator FSC fuel surcharge rates percentage yard pull dry run no empty driver pay customer cost tools calculation math compute", 
        category: "tools" 
      },
      { 
        title: "Team Management System", 
        content: "create teams colors assign dispatchers filtering 12 colors blue green red orange yellow purple pink indigo gray teal emerald cyan team management", 
        category: "tools" 
      },
      { 
        title: "Alert & Notification System", 
        content: "notifications desktop audio alerts toast notifications browser tab flashing team filtering universal filtering critical warning reminder alerts alert system multi-computer notification all tabs notify consistently auto cleanup daily 3am maintenance history clear scheduler node-cron automatic", 
        category: "detention" 
      },
      { 
        title: "Accessorial Guide & Pricing", 
        content: "accessorial guide overweight 100 dollars hazmat 75 dollars scale light heavy 50 dollars riverdale joliet yard storage rates 30 dollars charges pricing", 
        category: "tools" 
      }
    ];
    
    contentSections.forEach(section => {
      const relevance = getSearchRelevance(section.content, searchTerm);
      if (relevance > 0) {
        // Convert raw score to percentage (normalize to 0-100 scale)
        const percentage = Math.min(100, Math.round((relevance / 150) * 100));
        results.push({ ...section, relevance: percentage });
      }
    });
    
    return results.sort((a, b) => b.relevance - a.relevance).slice(0, 8);
  };

  // Auto-focus input when switching to AI tab
  useEffect(() => {
    if (activeTab === "ai-assistant") {
      // Use multiple timing strategies for reliable focus
      const focusInput = () => {
        if (chatInputRef.current) {
          chatInputRef.current.focus();

        }
      };
      
      // Immediate attempt
      requestAnimationFrame(focusInput);
      // Fallback attempts
      setTimeout(focusInput, 50);
      setTimeout(focusInput, 200);
    }
  }, [activeTab]);

  // Fetch available AI providers
  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const response = await apiRequest('GET', '/api/ai-providers');
        
        if ((response as any)?.providers && Array.isArray((response as any).providers)) {
          setAvailableProviders((response as any).providers);
        } else {
          console.warn('Invalid providers response format:', response);
          throw new Error('Invalid response format');
        }
        setProvidersLoaded(true);
      } catch (error) {
        console.warn('Failed to fetch AI providers, using defaults:', error);
        // Set default providers if endpoint doesn't exist
        const defaultProviders = [
          { id: 'auto', name: 'Auto-detect', available: true, description: 'Automatically use available provider' },
          { id: 'openai', name: 'OpenAI GPT', available: false, description: 'GPT-3.5 Turbo' },
          { id: 'anthropic', name: 'Claude', available: false, description: 'Claude 3 Haiku' },
          { id: 'gemini', name: 'Google Gemini', available: true, description: 'Gemini 1.5 Flash' },
          { id: 'groq', name: 'Groq', available: true, description: 'Llama3-8B' },
          { id: 'perplexity', name: 'Perplexity', available: false, description: 'Sonar Models' }
        ];

        setAvailableProviders(defaultProviders);
        setProvidersLoaded(true);
      }
    };
    
    if (activeTab === 'ai-assistant') {
      fetchProviders(); // Always refresh when switching to AI tab
    }
  }, [activeTab]);

  // AI Assistant functionality
  const sendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setCurrentMessage("");
    setIsLoading(true);
    setAiError(null);

    try {
      const requestBody = { 
        message: userMessage.content,
        ...(selectedProvider !== 'auto' && { provider: selectedProvider })
      };
      

      
      // Use apiRequest and parse JSON properly
      const response = await apiRequest('POST', '/api/ai-assistant', requestBody);
      const responseData = await response.json();
      

      
      // Extract response content
      let responseContent = '';
      let providerName = selectedProvider;
      
      // Check for response.response (primary format)
      if (responseData.response) {
        responseContent = String(responseData.response);
      }
      // Check for response.message (alternative format)
      else if (responseData.message) {
        responseContent = String(responseData.message);
      }
      else {
        responseContent = 'Error: No response content found';
      }
      
      // Extract provider info
      if (responseData.provider) {
        providerName = String(responseData.provider);
      }
      

      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
        provider: providerName
      };

      setChatMessages(prev => [...prev, assistantMessage]);
      
      // Scroll to bottom after message is added
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('AI Assistant error:', error);
      setAiError(error instanceof Error ? error.message : 'Failed to get response from AI assistant');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setChatMessages([]);
    setAiError(null);
  };

  // Recent changes data extracted from replit.md
  const recentChanges = [
    {
      date: "July 30, 2025",
      title: "Automated Daily Alert History Cleanup System",
      items: [
        "Scheduled Alert Cleanup: Added automatic alert history clearing at 3:00 AM daily to prevent alert pile-up",
        "Node-Cron Integration: Implemented node-cron scheduler for reliable task scheduling with timezone support",
        "Database Enhancement: Added clearAllAlerts() method to storage interface for complete alert removal",
        "Graceful Shutdown: Scheduler properly stops during server shutdown for clean maintenance cycles",
        "Background Processing: Daily cleanup runs silently without user intervention, maintaining system performance",
        "Logging Integration: Alert cleanup events logged through existing server logging system for monitoring",
        "Production Ready: Scheduler service designed for production environments with automatic startup"
      ]
    },
    {
      date: "July 24, 2025",
      title: "Comprehensive AI Knowledge Base Enhancement for Complete App Mastery",
      items: [
        "Complete Calculator Documentation: Added detailed knowledge of both Load Cost/Pay Calculator (two-tab interface, FSC percentages, auto-clear) and Detention Time/Cost Calculator (all 5 stop types, timing rules, $1.25/minute rate)",
        "Team Management System Details: Documented database structure, 12 color options with emojis, creation process, filtering logic, and default teams (Dispatch 1: Alen+Dean, Dispatch 2: Matt+Taiwan)",
        "Advanced Detention Rules: Comprehensive documentation of stop type-specific detention thresholds, alert types (Warning, Critical, Reminder), and exact timing procedures",
        "Complete Accessorial Reference: Full A Tab charges (Flip $80/$50, Driver Count $50/$40), C Tab charges (HazMat $75, Overweight $100), and all 17 Riverdale yard locations with three rate tiers",
        "Universal Notification System: Detailed multi-computer notification capabilities, team-based filtering, tab flashing patterns, professional favicon system, and service worker bypass",
        "Professional UI Documentation: Color-coded buttons, status indicators, dashboard metrics, keyboard shortcuts, error handling, and complete technical architecture",
        "Industry-Specific Knowledge: Proper trucking terminology, exact button locations, step-by-step procedures, and comprehensive troubleshooting guidance for AI assistant"
      ]
    },
    {
      date: "July 18, 2025",
      title: "Complete team-based alert notification system implementation",
      items: [
        "WebSocket Filtering: Enhanced WebSocket hook to filter all desktop notifications and audio alerts based on selected team/dispatcher",
        "Toast Notification Filtering: Updated AlertToast component to respect team selection for in-app notifications", 
        "Comprehensive Alert Filtering: All alert systems now properly filter by team - when 'Dispatch 1' is selected, only alerts for Alen+Dean drivers are shown",
        "Performance Optimization: Fixed circular dependency issues by passing data as props instead of using useQuery within WebSocket hook",
        "Complete Notification Control: Desktop notifications, audio alerts, toast notifications, and UI components all consistently filter by team selection",
        "Dashboard Layout Optimization: Switched positions of 'Detention' and 'Reminders' in Driver Status & Alerts section for improved priority display",
        "Enhanced Accessorial Guide: Added comprehensive yard storage fee information with amber-themed section"
      ]
    },
    {
      date: "July 17, 2025", 
      title: "Critical fix for completed driver detention calculation and display system",
      items: [
        "Critical Departure Endpoint Fix: Fixed major bug where departure time was calculated BEFORE being saved to database, causing zero detention for completed drivers",
        "Calculation Timing Fix: Departure endpoint now saves departure time first, then calculates detention with both appointment and departure times present",
        "Progress Bar Data Source Fix: Updated DetentionProgressBar component to check both finalDetentionMinutes from location and driver.detentionMinutes",
        "Status Retention: Completed stops that had detention remain red 'detention' status instead of turning green 'completed' for better visibility"
      ]
    },
    {
      date: "July 17, 2025",
      title: "Comprehensive driver deactivation/reactivation system with dispatcher filtering", 
      items: [
        "Driver Activation Toggle: Added power buttons to deactivate/reactivate drivers when trucks break down or for maintenance",
        "Visual Status Indicators: Inactive drivers shown with red styling and 'INACTIVE' badge in management section",
        "Main Dashboard Filtering: Inactive drivers automatically hidden from main dashboard view while remaining visible in management section",
        "Dispatcher Filter in Management: Added dropdown filter by dispatcher with 'All' option in driver management section"
      ]
    },
    {
      date: "July 18, 2025",
      title: "Complete database-backed team management system implementation",
      items: [
        "Database Schema: Added teams table with id, name, color, dispatchers array, and timestamps fields",
        "Full CRUD API: Implemented complete REST API for teams (GET, POST, PATCH, DELETE /api/teams)",
        "Team Management UI: Built complete team management interface in settings with create/edit/delete functionality",
        "Dynamic Team Filtering: All components now use database teams for filtering"
      ]
    },
    {
      date: "July 18, 2025", 
      title: "Expanded team color options from 2 to 12 colors with full styling support",
      items: [
        "Extended Color Palette: Added 10 new color options: red, orange, yellow, purple, pink, indigo, gray, teal, emerald, cyan",
        "Color System Design: Created comprehensive TEAM_COLORS constant with emojis, CSS classes, and labels for each color",
        "Visual Consistency: Each color includes matching emoji (🟥, 🟧, 🟨, 🟪, 💗, 🟫, ⬜, 🔷, 💚, 💙), background, text, and border classes",
        "Dropdown Enhancement: Updated team color selection dropdowns to display all 12 options in both create and edit modes"
      ]
    }
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0"
            title="Help & Guide"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[95vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Dispatcher Helper - Complete Guide
          </DialogTitle>
        </DialogHeader>
        
        {/* Enhanced Search Interface */}
        <div className="px-6 py-4 border-b flex-shrink-0">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Quick Find: detention, stop types, calculators, teams..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3"
            />
            
            {/* Search Suggestions */}
            {searchTerm.length >= 2 && searchTerm.length < 4 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-md shadow-lg z-50 max-h-48 overflow-y-auto">
                <div className="p-2 text-xs text-gray-500 border-b">
                  Smart Suggestions:
                </div>
                {getSearchSuggestions(searchTerm).map((suggestion, index) => (
                  <button
                    key={index}
                    onClick={() => setSearchTerm(suggestion)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-b last:border-b-0"
                  >
                    <span className="text-gray-800">{suggestion}</span>
                  </button>
                ))}
                {getSearchSuggestions(searchTerm).length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 italic">
                    Keep typing for search results...
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Search Status */}
          {searchTerm.trim() && searchTerm.length >= 2 && (
            <div className="mt-2 text-xs text-gray-500">
              {getSearchResults().length > 0 ? (
                <>Found {getSearchResults().length} relevant sections • Showing ranked results</>
              ) : (
                <span className="text-amber-600">No matches found. Try: "appointment", "detention", "calculator", "teams"</span>
              )}
            </div>
          )}
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
            <TabsList className="grid w-full grid-cols-8 flex-shrink-0 mb-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="detention">Detention</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="tools">Tools</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="changelog">Changelog</TabsTrigger>
              <TabsTrigger value="tips">Tips & FAQ</TabsTrigger>
              <TabsTrigger value="ai-assistant" className="text-purple-600">
                <Bot className="h-3.5 w-3.5 mr-1" />
                AI Assistant
              </TabsTrigger>
            </TabsList>
            
            <div className="flex-1 overflow-y-auto px-6 py-4 min-h-0" style={{ maxHeight: 'calc(95vh - 200px)' }}>
            {/* Enhanced Search Results with Ranking */}
            {searchTerm.trim() && searchTerm.length >= 2 ? (
              <div className="space-y-6">
                <div className="mb-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Search Results</h3>
                    <span className="text-sm text-gray-500">
                      {getSearchResults().length} results for "{searchTerm}"
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Results ranked by relevance • Fuzzy matching enabled for typos
                  </p>
                </div>
                
                {/* Clickable Ranked Search Results */}
                {getSearchResults().map((result, index) => (
                  <button
                    key={index}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();

                      handleSearchResultClick(result);
                    }}
                    className={`w-full text-left border-l-4 pl-4 pr-3 py-3 rounded-r-lg transition-all duration-200 hover:bg-gray-50 hover:shadow-md cursor-pointer group active:scale-95 ${
                      result.category === 'overview' ? 'border-blue-500 hover:border-blue-600' :
                      result.category === 'detention' ? 'border-orange-500 hover:border-orange-600' :
                      result.category === 'actions' ? 'border-green-500 hover:border-green-600' :
                      result.category === 'tools' ? 'border-purple-500 hover:border-purple-600' :
                      'border-gray-500 hover:border-gray-600'
                    }`}
                  >
                    <div className={`text-xs font-semibold mb-1 flex items-center justify-between ${
                      result.category === 'overview' ? 'text-blue-600' :
                      result.category === 'detention' ? 'text-orange-600' :
                      result.category === 'actions' ? 'text-green-600' :
                      result.category === 'tools' ? 'text-purple-600' :
                      'text-gray-600'
                    }`}>
                      <span>{result.category.toUpperCase()} TAB • {result.relevance}% match</span>
                      <span className="text-xs text-gray-400 group-hover:text-gray-600 transition-colors flex items-center gap-1">
                        Click to jump & highlight 
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </div>
                    <h4 className="font-semibold text-sm mb-2 group-hover:text-gray-900 transition-colors">
                      {highlightMatch(result.title, searchTerm)}
                    </h4>
                    <p className="text-sm text-gray-600 group-hover:text-gray-700 transition-colors">
                      {highlightMatch(result.content, searchTerm)}
                    </p>
                  </button>
                ))}
                
                {/* No Results Message with Suggestions */}
                {getSearchResults().length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Search className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
                    <p className="text-sm text-gray-500 mb-4">
                      Try these popular searches or browse tabs directly:
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center mb-4">
                      {['appointment', 'detention', 'calculator', 'teams', 'alerts', 'drivers'].map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setSearchTerm(suggestion)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        { name: 'Overview', tab: 'overview', color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
                        { name: 'Detention', tab: 'detention', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200' },
                        { name: 'Actions', tab: 'actions', color: 'bg-green-100 text-green-700 hover:bg-green-200' },
                        { name: 'Tools', tab: 'tools', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200' }
                      ].map((tabOption) => (
                        <button
                          key={tabOption.tab}
                          onClick={() => {
                            setActiveTab(tabOption.tab);
                            setSearchTerm(''); // Clear search to show full tab content
                          }}
                          className={`px-3 py-1 text-xs rounded-full transition-colors ${tabOption.color}`}
                        >
                          Go to {tabOption.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Enhanced Search Tips */}
                {getSearchResults().length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      Quick Find Features
                    </h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• <strong>Click & go:</strong> Navigate directly to relevant content with instant highlighting</li>
                      <li>• <strong>Content highlighting:</strong> Target section gets temporary yellow highlight</li>
                      <li>• <strong>Search persistence:</strong> Terms stay highlighted in destination tabs</li>
                      <li>• <strong>Synonym matching:</strong> "truck" finds "vehicle", "rig", "semi"</li>
                      <li>• <strong>Typo tolerance:</strong> "apointment" finds "appointment"</li>
                      <li>• <strong>Industry terms:</strong> "detention", "FSC", "yard pull", "drop hook"</li>
                    </ul>
                  </div>
                )}
              </div>
            ) : searchTerm.trim() && searchTerm.length < 2 ? (
              <div className="mb-4 text-center">
                <p className="text-sm text-gray-500">Type at least 2 characters to search...</p>
              </div>
            ) : null}

            {/* OVERVIEW TAB */}
            <TabsContent value="overview" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="space-y-4">
                {(!searchTerm.trim() || matchesSearch("What is Dispatcher Helper fleet management system monitor truck drivers track detention times automated alerts appointment")) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {highlightMatch("What is Dispatcher Helper?", searchTerm)}
                    </h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {highlightMatch("Dispatcher Helper is a comprehensive fleet management system designed to monitor truck drivers, track detention times, and provide automated alerts for appointment-based detention monitoring.", searchTerm)}
                    </p>
                  </div>
                )}

                {(!searchTerm.trim() || matchesSearch("separator")) && <Separator />}

                {(!searchTerm.trim() || matchesSearch("Key Features Real-time Detention Tracking Live Seconds Comprehensive Alert Notification System")) && (
                  <div>
                    <h3 className="text-lg font-semibold mb-2">
                      {highlightMatch("Key Features", searchTerm)}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-2">
                        {(!searchTerm.trim() || matchesSearch("Real-time Detention Tracking Live Seconds")) && (
                          <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">
                              {highlightMatch("Real-time Detention Tracking with Live Seconds", searchTerm)}
                            </span>
                          </div>
                        )}
                        {(!searchTerm.trim() || matchesSearch("Comprehensive Alert Notification System")) && (
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <span className="text-sm font-medium">
                              {highlightMatch("Comprehensive Alert & Notification System", searchTerm)}
                            </span>
                          </div>
                        )}
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">Team-Based Dispatcher Management</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Driver Activation/Deactivation</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calculator className="h-4 w-4 text-green-500" />
                        <span className="text-sm font-medium">Cost Calculator Tools</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium">Accessorial Rate Guide</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4 text-indigo-500" />
                        <span className="text-sm font-medium">Live Status Monitoring</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <RotateCcw className="h-4 w-4 text-purple-500" />
                        <span className="text-sm font-medium">Advanced Sorting & Filtering</span>
                      </div>
                    </div>
                  </div>
                </div>
                )}

                {(!searchTerm.trim() || matchesSearch("separator")) && <Separator />}

                {(!searchTerm.trim() || matchesSearch("Driver Status Definitions")) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Driver Status Definitions</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Understanding what each driver status means:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">🔵</span>
                        <span className="font-medium text-sm">Standby</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Driver has no active appointment or has completed their load.
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">🟢</span>
                        <span className="font-medium text-sm">At Stop</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Driver has active appointment timer running but not yet in detention. 
                        Shows live countdown with seconds and detention start time display.
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">⚠️</span>
                        <span className="font-medium text-sm">Warning</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Driver is approaching or just entered detention period.
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">🔴</span>
                        <span className="font-medium text-sm">Detention</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Driver is actively accumulating detention charges ($1.25/minute). 
                        Shows live minutes/seconds and detention start time in both duration and progress columns.
                      </p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-sm">✅</span>
                        <span className="font-medium text-sm">Completed</span>
                      </div>
                      <p className="text-xs text-gray-600">
                        Driver has departure time recorded and load is complete. 
                        Stays visible until manually reset. Higher priority than standby for easy tracking.
                      </p>
                    </div>
                  </div>
                </div>
                )}

                {(!searchTerm.trim() || matchesSearch("separator")) && <Separator />}

                {(!searchTerm.trim() || matchesSearch("Dashboard Layout")) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">Dashboard Layout</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Dashboard panels are ordered for operational priority:
                  </p>
                  <div className="text-sm text-gray-600 grid grid-cols-2 gap-1 mb-3">
                    <span>1. Total Fleet</span><span>4. Warnings</span>
                    <span>2. Standby</span><span>5. Detention</span>
                    <span>3. At Stop</span><span>6. Reminders</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Alert counts dim after 1 second when marked as read for quick visual feedback.
                    Driver status filter shows options in priority order (detention first, standby last).
                  </p>
                </div>
                )}

                {(!searchTerm.trim() || matchesSearch("separator")) && <Separator />}

                {(!searchTerm.trim() || matchesSearch("How to Get Started")) && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">How to Get Started</h3>
                  <ol className="text-sm space-y-2 text-gray-600">
                    <li><span className="font-medium">1.</span> Add dispatchers using the settings gear icon</li>
                    <li><span className="font-medium">2.</span> Add drivers and assign them to dispatchers</li>
                    <li><span className="font-medium">3.</span> Set appointment times for active loads</li>
                    <li><span className="font-medium">4.</span> Monitor detention progress in real-time</li>
                    <li><span className="font-medium">5.</span> Record departure times to calculate total detention</li>
                    <li><span className="font-medium">6.</span> Use filters and sorting to manage driver lists efficiently</li>
                  </ol>
                </div>
                )}
              </div>
            </TabsContent>

            {/* DETENTION TAB */}
            <TabsContent value="detention" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Stop Types & Detention Rules</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Different stop types have different detention thresholds and billing rules:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <Badge variant="outline" className="text-xs">Regular</Badge>
                    </div>
                    <p className="text-sm"><strong>Detention:</strong> After 2 hours</p>
                    <p className="text-sm"><strong>Warning:</strong> 30 min before + Critical alert at start</p>
                    <p className="text-sm"><strong>Reminders:</strong> Every 30 min during detention</p>
                    <p className="text-sm"><strong>Rate:</strong> $1.25/minute</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      <Badge variant="outline" className="text-xs">Multi-Stop</Badge>
                    </div>
                    <p className="text-sm"><strong>Detention:</strong> After 1 hour</p>
                    <p className="text-sm"><strong>Warning:</strong> 15 min before + Critical alert at start</p>
                    <p className="text-sm"><strong>Reminders:</strong> Every 30 min during detention</p>
                    <p className="text-sm"><strong>Rate:</strong> $1.25/minute</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Train className="h-4 w-4 text-green-500" />
                      <Badge variant="outline" className="text-xs">Rail</Badge>
                    </div>
                    <p className="text-sm"><strong>Detention:</strong> After 1 hour</p>
                    <p className="text-sm"><strong>Alerts:</strong> Critical alert when detention starts</p>
                    <p className="text-sm"><strong>Reminders:</strong> Every 30 min during detention</p>
                    <p className="text-sm"><strong>Rate:</strong> $1.25/minute</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="h-4 w-4 text-orange-500" />
                      <Badge variant="outline" className="text-xs">Drop/Hook</Badge>
                    </div>
                    <p className="text-sm"><strong>Detention:</strong> After 30 minutes</p>
                    <p className="text-sm"><strong>Alerts:</strong> Critical alert when detention starts</p>
                    <p className="text-sm"><strong>Reminders:</strong> Every 30 min during detention</p>
                    <p className="text-sm"><strong>Rate:</strong> $1.25/minute</p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="h-4 w-4 text-purple-600" />
                      <Badge variant="outline" className="text-xs">No Billing</Badge>
                    </div>
                    <p className="text-sm"><strong>Detention:</strong> After 15 minutes</p>
                    <p className="text-sm"><strong>Alerts:</strong> Critical alert when detention starts</p>
                    <p className="text-sm"><strong>Reminders:</strong> Every 30 min during detention</p>
                    <p className="text-sm"><strong>Rate:</strong> $1.25/minute (tracked but not billed)</p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Alert System</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                    <h4 className="font-medium text-blue-800 mb-2">Alert Types & Timing</h4>
                    <ul className="text-sm space-y-1 text-blue-700">
                      <li><strong>Warning Alerts:</strong> Sent before detention period begins (Regular/Multi-Stop only)</li>
                      <li><strong>Critical Alerts:</strong> Sent immediately when detention starts (ALL stop types)</li>
                      <li><strong>Reminder Alerts:</strong> Sent every 30 minutes during ongoing detention</li>
                    </ul>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <h4 className="font-medium text-green-800 mb-2">Universal Multi-Computer Notification System</h4>
                    <ul className="text-sm space-y-1 text-green-700">
                      <li><strong>All Tabs Notify:</strong> WebSocket server broadcasts alerts to ALL browser tabs across ALL computers simultaneously</li>
                      <li><strong>Universal Tab Flashing:</strong> All tabs flash when alerts exist, regardless of focus state or computer</li>
                      <li><strong>Professional Favicon Alerts:</strong> Blue truck icon alternates with red alert badge showing exact count</li>
                      <li><strong>Background Tab Detection:</strong> Enhanced flashing continues even when tabs are hidden using aggressive bypass methods</li>
                      <li><strong>Multi-Computer Support:</strong> Perfect for setups with multiple dispatchers on different computers - all get same notifications</li>
                      <li><strong>Browser Deduplication:</strong> Same machine prevents duplicate notifications via browser tagging</li>
                      <li><strong>Auto History Cleanup:</strong> Alert history automatically clears daily at 3:00 AM CST to prevent accumulation</li>
                      <li><strong>Team-Based Filtering:</strong> ALL notification channels actively filter by selected team/dispatcher</li>
                      <li><strong>Audio Alerts:</strong> Sound alerts play on all tabs and filter by team selection</li>
                      <li><strong>Toast Notifications:</strong> In-app popup alerts respect team filtering</li>
                      <li><strong>Service Worker Bypass:</strong> Background notifications work even when browser tabs are inactive</li>
                      <li><strong>Consistent Experience:</strong> Same behavior whether using one tab or multiple computers</li>
                    </ul>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Detention Workflow</h3>
                  <ol className="text-sm space-y-2 text-gray-600">
                    <li><span className="font-medium">1.</span> Set appointment time for driver's current load</li>
                    <li><span className="font-medium">2.</span> Select appropriate stop type (Regular, Multi-Stop, Rail, etc.)</li>
                    <li><span className="font-medium">3.</span> System calculates detention start time automatically</li>
                    <li><span className="font-medium">4.</span> Critical alerts sent when detention begins, reminders every 30 minutes</li>
                    <li><span className="font-medium">5.</span> Real-time detention tracking displays minutes and costs</li>
                    <li><span className="font-medium">6.</span> Record departure time to finalize detention calculation</li>
                  </ol>
                </div>
              </div>
            </TabsContent>

            {/* ACTIONS TAB */}
            <TabsContent value="actions" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Driver Actions</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Available actions for each driver in the driver list:
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="font-medium text-sm">Set Appointment</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Set appointment time for current load. Enter time in HH:MM format (24-hour). 
                      System automatically defaults to same-day appointments.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <LogOut className="h-4 w-4 text-green-500" />
                      <span className="font-medium text-sm">Set Departure</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Record departure time to calculate final detention. Only available for drivers 
                      with active appointments. Automatically calculates total detention cost.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <RotateCcw className="h-4 w-4 text-orange-500" />
                      <span className="font-medium text-sm">Reset Driver</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      Clear appointment and departure times, reset stop type to Regular. 
                      Does not affect driver alerts. One-click operation.
                    </p>
                  </div>

                  <div className="border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Eye className="h-4 w-4 text-purple-500" />
                      <span className="font-medium text-sm">View Alert History</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      View all alerts generated for the driver including warnings, reminders, 
                      and detention notifications with timestamps. History automatically clears daily at 3:00 AM CST.
                    </p>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Stop Type Selection</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Click the colored stop type buttons to change detention rules:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="cursor-pointer bg-gray-100 text-gray-800 border-gray-300">Regular</Badge>
                    <Badge variant="outline" className="cursor-pointer bg-blue-100 text-blue-800 border-blue-300">Multi-Stop</Badge>
                    <Badge variant="outline" className="cursor-pointer bg-green-100 text-green-800 border-green-300">Rail</Badge>
                    <Badge variant="outline" className="cursor-pointer bg-orange-100 text-orange-800 border-orange-300">Drop/Hook</Badge>
                    <Badge variant="outline" className="cursor-pointer bg-purple-100 text-purple-800 border-purple-300">No Billing</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TOOLS TAB */}
            <TabsContent value="tools" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Management Tools</h3>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">Settings (Gear Icon)</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Access driver and dispatcher management through tabbed interface:
                  </p>
                  <ul className="text-sm space-y-1 text-gray-600 ml-4">
                    <li>• <strong>Driver Management:</strong> Add, edit, delete drivers with truck numbers</li>
                    <li>• <strong>Driver Activation:</strong> Deactivate/reactivate drivers when trucks break down or for maintenance</li>
                    <li>• <strong>Dispatcher Filter:</strong> Filter drivers by dispatcher in management section with "All" option</li>
                    <li>• <strong>Dispatcher Management:</strong> Add/remove standalone dispatchers</li>
                    <li>• <strong>Team Management:</strong> Create custom teams with colors, assign dispatchers to teams</li>
                    <li>• <strong>Team Filtering:</strong> Filter by teams or individual dispatchers throughout the application</li>
                    <li>• <strong>Sorting Options:</strong> Sort by truck number (default), driver name, or dispatcher</li>
                    <li>• Validation prevents empty fields and deletion of dispatchers with assigned drivers</li>
                    <li>• Inactive drivers are hidden from main dashboard but visible in management section</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-indigo-500" />
                    <span className="font-medium">Sorting & Filtering</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Advanced options for managing driver lists and views:
                  </p>
                  <ul className="text-sm space-y-1 text-gray-600 ml-4">
                    <li>• <strong>Status Priority:</strong> Detention → Critical → Warning → At Stop → Completed → Standby</li>
                    <li>• <strong>Status Filter:</strong> View by detention, warning, at stop, completed, standby, or reminders</li>
                    <li>• <strong>Sorting Options:</strong> Sort by status (default), truck number, driver name, or detention time</li>
                    <li>• <strong>Smart Secondary Sorting:</strong> Warning and At-Stop drivers sorted by time remaining to detention (closest first), Detention drivers by total detention time (highest first), others by truck number</li>
                    <li>• <strong>Completed Status:</strong> Drivers with departure times stay visible until reset</li>
                    <li>• <strong>Search Function:</strong> Filter drivers by name or truck number</li>
                    <li>• <strong>Dispatcher Filter:</strong> Show only drivers for specific dispatchers</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Calculator className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Load Cost/Pay Calculator</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Two-tab calculator for different scenarios:
                  </p>
                  <ul className="text-sm space-y-1 text-gray-600 ml-4">
                    <li>• <strong>Dry Run/Yard Pull:</strong> 4-field layout with customer cost, driver pay, fuel calculations</li>
                    <li>• <strong>Driver FSC/No Empty:</strong> 2-field layout calculating fuel percentage of driver pay</li>
                    <li>• Dynamic fuel percentages from 20% to 40% in 0.5% increments</li>
                    <li>• Color-coded output fields with instant calculations</li>
                    <li>• All inputs cleared automatically when calculator opens for fresh calculations</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-orange-500" />
                    <span className="font-medium">Detention Time/Cost Calculator</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Calculate detention costs and timing:
                  </p>
                  <ul className="text-sm space-y-1 text-gray-600 ml-4">
                    <li>• <strong>Time-based Calculator:</strong> Input appointment and departure times</li>
                    <li>• <strong>Stop Type Selection:</strong> Choose appropriate detention threshold</li>
                    <li>• <strong>Automatic Calculations:</strong> Instant detention minutes and cost totals</li>
                    <li>• <strong>Timeline Preview:</strong> Visual breakdown of warning and detention periods</li>
                    <li>• <strong>Quick Reference:</strong> All stop types with detention thresholds and rates</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Accessorial Guide</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Quick reference for common charges:
                  </p>
                  <ul className="text-sm space-y-1 text-gray-600 ml-4">
                    <li>• <strong>Accessorial Charges:</strong> Overweight ($100), HazMat ($75), Scale Light/Heavy ($50 + Scale Tickets Cost)</li>
                    <li>• <strong>Riverdale Yard Rates:</strong> Complete rate table with location-based pricing</li>
                    <li>• Color-coded rate categories for easy identification</li>
                  </ul>
                </div>

                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Settings className="h-4 w-4 text-blue-600" />
                    <span className="font-medium">Team Management System</span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    Create and manage dispatcher teams for organized workflow:
                  </p>
                  <ul className="text-sm space-y-1 text-gray-600 ml-4">
                    <li>• <strong>Create Teams:</strong> Add custom teams with unique names and 12 color options</li>
                    <li>• <strong>Color Selection:</strong> Choose from blue, green, red, orange, yellow, purple, pink, indigo, gray, teal, emerald, or cyan</li>
                    <li>• <strong>Assign Dispatchers:</strong> Select which dispatchers belong to each team</li>
                    <li>• <strong>Team Filtering:</strong> Filter entire dashboard by team to show combined drivers from all team members</li>
                    <li>• <strong>Dynamic Updates:</strong> Teams are stored in database and sync across all users</li>
                    <li>• <strong>CRUD Operations:</strong> Create, edit, delete teams with full validation and error handling</li>
                    <li>• <strong>Visual Indicators:</strong> Teams display with color-coded emojis (🟦 🟩 🟥 🟧 🟨 🟪 💗 🟫 ⬜ 🔷 💚 💙) throughout the interface</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Filtering & Sorting</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium text-sm mb-1">Dispatcher/Team Filter</h4>
                      <p className="text-xs text-gray-600">
                        Filter by individual dispatcher, custom teams, or view all. Teams show combined drivers from all members.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Status Filter</h4>
                      <p className="text-xs text-gray-600">
                        Filter by All, Active, Warning, Critical, Detention, or Reminders status.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Sort Options</h4>
                      <p className="text-xs text-gray-600">
                        Sort by Status (default), Truck #, Name, or Detention time.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm mb-1">Search</h4>
                      <p className="text-xs text-gray-600">
                        Search by driver name, truck number, or vehicle information.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TEAMS TAB */}
            <TabsContent value="teams" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Team Management System</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Create and manage custom dispatcher teams for organized workflow and efficient filtering.
                  </p>
                </div>

                <div className="border rounded-lg p-4 bg-blue-50">
                  <h4 className="font-medium text-blue-800 mb-2">🟦 What are Teams?</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Teams are customizable groups of dispatchers that work together. Instead of filtering by individual 
                    dispatchers, you can filter by teams to see all drivers managed by team members at once.
                  </p>
                  <ul className="text-sm space-y-1 text-blue-700">
                    <li>• Teams are stored in the database and sync across all users</li>
                    <li>• Each team has a unique name and color from 12 available options</li>
                    <li>• Choose from: Blue 🟦, Green 🟩, Red 🟥, Orange 🟧, Yellow 🟨, Purple 🟪, Pink 💗, Indigo 🟫, Gray ⬜, Teal 🔷, Emerald 💚, Cyan 💙</li>
                    <li>• Dispatchers can be assigned to multiple teams if needed</li>
                    <li>• Teams appear in filter dropdowns with visual color indicators</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Team Operations</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">Creating Teams</h4>
                      <ol className="text-sm space-y-1 text-gray-600">
                        <li>1. Click the settings gear icon</li>
                        <li>2. Navigate to the "Teams" tab</li>
                        <li>3. Enter team name and select color</li>
                        <li>4. Assign dispatchers using checkboxes</li>
                        <li>5. Click "Create Team" to save</li>
                      </ol>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">Editing Teams</h4>
                      <ol className="text-sm space-y-1 text-gray-600">
                        <li>1. Find team in the "Existing Teams" section</li>
                        <li>2. Click the edit button (pencil icon)</li>
                        <li>3. Modify name, color, or dispatcher assignments</li>
                        <li>4. Click "Update Team" to save changes</li>
                        <li>5. Changes reflect immediately across app</li>
                      </ol>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">Team Filtering</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Teams appear in dispatcher filter dropdown</li>
                        <li>• Show combined drivers from all team members</li>
                        <li>• Alert filtering respects team selection</li>
                        <li>• Dashboard metrics update for team view</li>
                        <li>• Color-coded visual indicators with 12 emoji options</li>
                      </ul>
                    </div>

                    <div className="border rounded-lg p-3">
                      <h4 className="font-medium text-sm mb-2">Deleting Teams</h4>
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>• Click the delete button (trash icon)</li>
                        <li>• Team is removed from database</li>
                        <li>• Dispatchers remain unaffected</li>
                        <li>• Changes sync immediately</li>
                        <li>• No confirmation dialog required</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 bg-green-50">
                  <h4 className="font-medium text-green-800 mb-2">🟩 Team Best Practices</h4>
                  <ul className="text-sm space-y-1 text-green-700">
                    <li>• Use descriptive team names (e.g., "Night Shift", "East Coast Team")</li>
                    <li>• Assign team colors from 12 options based on shifts, regions, or preferences</li>
                    <li>• Create teams that reflect your actual dispatch organization</li>
                    <li>• Update team assignments when dispatchers change roles</li>
                    <li>• Use team filtering to focus on specific dispatch groups during busy periods</li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Team Color Options</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    Choose from 12 color options to organize your teams visually:
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🟦</span>
                      <p className="text-xs">Blue</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🟩</span>
                      <p className="text-xs">Green</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🟥</span>
                      <p className="text-xs">Red</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🟧</span>
                      <p className="text-xs">Orange</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🟨</span>
                      <p className="text-xs">Yellow</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🟪</span>
                      <p className="text-xs">Purple</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">💗</span>
                      <p className="text-xs">Pink</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🟫</span>
                      <p className="text-xs">Indigo</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">⬜</span>
                      <p className="text-xs">Gray</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">🔷</span>
                      <p className="text-xs">Teal</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">💚</span>
                      <p className="text-xs">Emerald</p>
                    </div>
                    <div className="text-center p-2 border rounded">
                      <span className="text-lg">💙</span>
                      <p className="text-xs">Cyan</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    Colors help distinguish teams at a glance and are consistent throughout the interface.
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold mb-2">Default Teams</h3>
                  <p className="text-sm text-gray-600 mb-3">
                    The system comes with two default teams that you can modify or delete:
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span>🟩</span>
                        <span className="font-medium text-sm">Dispatch 1</span>
                      </div>
                      <p className="text-xs text-gray-600">Green team with Alen and Dean</p>
                    </div>
                    <div className="border rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span>🟦</span>
                        <span className="font-medium text-sm">Dispatch 2</span>
                      </div>
                      <p className="text-xs text-gray-600">Blue team with Matt and Taiwan</p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* CHANGELOG TAB */}
            <TabsContent value="changelog" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="space-y-4">
                {(!searchTerm.trim() || matchesSearch("Complete Development History")) && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <History className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold">Complete Development History</h3>
                  </div>
                  <p className="text-sm text-gray-600 mb-4">
                    {highlightMatch("Full timeline of all features, improvements, and fixes implemented in Dispatcher Helper from initial development to current state.", searchTerm)}
                  </p>
                </div>
                )}

                {/* Version 2.2.0 - July 30, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 2.2.0 Automated Daily Alert History Cleanup July 30 2025 node-cron scheduler maintenance")) && (
                <div className="border rounded-lg p-4 bg-purple-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="bg-purple-600">v2.2.0</Badge>
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="font-semibold text-purple-600">{highlightMatch("July 30, 2025 - Automated Daily Alert History Cleanup", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Scheduled Alert Cleanup: Added automatic alert history clearing at 3:00 AM daily to prevent alert pile-up", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Node-Cron Integration: Implemented node-cron scheduler for reliable task scheduling with timezone support", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Database Enhancement: Added clearAllAlerts() method to storage interface for complete alert removal", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Graceful Shutdown: Scheduler properly stops during server shutdown for clean maintenance cycles", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Production Ready: Scheduler service designed for production environments with automatic startup", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 2.1.0 - July 19, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 2.1.0 Enhanced Help System July 19 2025 searchable content comprehensive changelog")) && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="bg-blue-600">v2.1.0</Badge>
                    <Calendar className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-blue-600">{highlightMatch("July 19, 2025 - Enhanced Help System", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Searchable Help System: Added real-time search functionality across all help content with highlighted matches", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Comprehensive Changelog Tab: Added dedicated changelog tab displaying recent changes automatically extracted from replit.md", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Search Highlighting: Implemented yellow highlight markers for search matches across all text content", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Tab Structure Enhancement: Expanded from 6 to 7 tabs to accommodate new changelog section", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Cross-Tab Quick Find: Quick Find functionality works across all help tabs with performance optimization", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 2.0.0 - July 18, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 2.0.0 Complete Team Management System July 18 2025 database-backed CRUD API")) && (
                <div className="border rounded-lg p-4 bg-green-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="bg-green-600">v2.0.0</Badge>
                    <Calendar className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-green-600">{highlightMatch("July 18, 2025 - Complete Team Management System", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Database Schema: Added teams table with id, name, color, dispatchers array, and timestamps fields", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Full CRUD API: Implemented complete REST API for teams (GET, POST, PATCH, DELETE /api/teams)", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("12-Color System: Extended team color options from 2 to 12 colors with full styling support", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("WebSocket Filtering: Enhanced alert notification system with team-based filtering", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Team Management UI: Built complete team management interface in settings with create/edit/delete functionality", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 1.5.0 - July 17, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 1.5.0 Dispatcher Filtering Detention Fixes July 17 2025 alert filtering deactivation")) && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">v1.5.0</Badge>
                    <Calendar className="h-4 w-4 text-purple-500" />
                    <span className="font-semibold text-purple-600">{highlightMatch("July 17, 2025 - Dispatcher Filtering & Detention Fixes", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Critical Departure Endpoint Fix: Fixed major bug where departure time was calculated BEFORE being saved to database", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Driver Activation Toggle: Added power buttons to deactivate/reactivate drivers when trucks break down", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Dashboard Alert Filtering: Main dashboard now filters alerts by selected dispatcher", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Cost Calculator Layout: Enhanced user experience with improved field organization", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Appointment-Based Alert Tracking: Replaced time-based deduplication with appointment-specific tracking", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 1.4.0 - July 16, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 1.4.0 Alert System Improvements July 16 2025 tab flashing timing display")) && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">v1.4.0</Badge>
                    <Calendar className="h-4 w-4 text-orange-500" />
                    <span className="font-semibold text-orange-600">{highlightMatch("July 16, 2025 - Alert System Improvements", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Smart Tab Flashing: Browser tab flashes between normal title and alert warning when user isn't viewing the tab", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Enhanced Timing Display: Added detention start times in both duration and progress columns", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Fixed Alert Count System: Removed bouncing animations and unified alert counting across components", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Dashboard Reorganization: Changed panel order for optimal operational priority flow", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("At Stop Text Fix: Eliminated duplicate text display and completed seconds timer functionality", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 1.3.0 - July 15, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 1.3.0 Help System Cloud Run July 15 2025 comprehensive documentation deployment")) && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">v1.3.0</Badge>
                    <Calendar className="h-4 w-4 text-indigo-500" />
                    <span className="font-semibold text-indigo-600">{highlightMatch("July 15, 2025 - Help System & Cloud Run", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("At Stop Status: Added new status for drivers with active appointment timers but not yet in detention", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Comprehensive Help System: Added question mark button with 6-tab help dialog covering all app functionality", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Enhanced Cloud Run Deployment: Added health endpoints, graceful shutdown, and production readiness", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Field Consolidation: Merged truck/vehicle fields into unified truckNumber field", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Unified Settings Dialog: Created tabbed management interface for drivers and dispatchers", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 1.2.0 - July 11, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 1.2.0 UI Enhancements Notifications July 11 2025 micro-interactions branding")) && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">v1.2.0</Badge>
                    <Calendar className="h-4 w-4 text-teal-500" />
                    <span className="font-semibold text-teal-600">{highlightMatch("July 11, 2025 - UI Enhancements & Notifications", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Application Branding: Updated from TruckTracker Pro to Dispatcher Helper", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Comprehensive UI Micro-interactions: Added emoji-based status indicators and animated transitions", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Accessorial Guide: Added comprehensive dispatcher reference with Riverdale yard rates", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Enhanced Desktop Notifications: Improved cross-browser support and visibility detection", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Critical Bug Fixes: Fixed departure tracking, appointment endpoints, and detention calculations", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Alert System Refinements: Added warning vs reminder distinction and enhanced dashboard layout", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 1.1.0 - July 10, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 1.1.0 Stop Types Cost Calculator July 10 2025 detention thresholds")) && (
                <div className="border rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">v1.1.0</Badge>
                    <Calendar className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold text-yellow-600">{highlightMatch("July 10, 2025 - Stop Types & Cost Calculator", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Comprehensive Stop Type System: Added five distinct stop types with different detention thresholds", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Multi-Stop Button: Detention after 1 hour, warning 15 minutes before detention starts", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Drop/Hook Button: Detention after 30 minutes, warning 30 minutes after detention starts", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Cost Calculator: Added dual-tab system with comprehensive fuel percentage calculations", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Advanced Filtering & Sorting: Added dropdown filters and sorting options for driver management", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {/* Version 1.0.0 - July 9, 2025 */}
                {(!searchTerm.trim() || matchesSearch("Version 1.0.0 Foundation Release July 9 2025 database migration notifications")) && (
                <div className="border rounded-lg p-4 bg-yellow-50">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="default" className="bg-yellow-600">v1.0.0</Badge>
                    <Calendar className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold text-yellow-600">{highlightMatch("July 9, 2025 - Foundation Release", searchTerm)}</span>
                  </div>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("PostgreSQL Migration: Successfully migrated from in-memory storage to PostgreSQL database", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Background Notifications: Added browser push notifications for critical and warning alerts", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Tab Title Alerts: Shows unread alert count in browser tab title", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Data Persistence: Drivers, locations, alerts, and settings now persist across server restarts", searchTerm)}</span></li>
                    <li className="flex items-start gap-2"><span className="text-green-500 mt-0.5">•</span><span>{highlightMatch("Database Setup: Added proper connection setup with Neon serverless driver and sample data", searchTerm)}</span></li>
                  </ul>
                </div>
                )}

                {searchTerm.trim() && (
                  <div className="text-center py-4 text-gray-500">
                    <Search className="h-6 w-6 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">{highlightMatch("Search across all versions and features above", searchTerm)}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TIPS & FAQ TAB */}
            <TabsContent value="tips" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">Best Practices</h3>
                  <div className="space-y-3">
                    <div className="border rounded-lg p-3 bg-green-50">
                      <h4 className="font-medium text-sm text-green-800 mb-1">✓ Do</h4>
                      <ul className="text-sm space-y-1 text-green-700">
                        <li>• Set appointment times as soon as drivers arrive at facilities</li>
                        <li>• Select the correct stop type before detention period begins</li>
                        <li>• Record departure times immediately when drivers leave</li>
                        <li>• Use the refresh button if data seems outdated</li>
                        <li>• Check notification permissions for real-time alerts</li>
                      </ul>
                    </div>

                    <div className="border rounded-lg p-3 bg-red-50">
                      <h4 className="font-medium text-sm text-red-800 mb-1">✗ Don't</h4>
                      <ul className="text-sm space-y-1 text-red-700">
                        <li>• Delete dispatchers who have drivers assigned to them</li>
                        <li>• Forget to set stop type - defaults to Regular (2-hour detention)</li>
                        <li>• Reset drivers unless you want to clear all appointment data</li>
                        <li>• Enter appointment times in 12-hour format (use 24-hour: 14:30 not 2:30 PM)</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="text-lg font-semibold mb-2">Common Questions</h3>
                  <div className="space-y-3">
                    {(!searchTerm.trim() || matchesSearch("Why isn't my driver showing detention time appointment stop type threshold")) && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          {highlightMatch("Q: Why isn't my driver showing detention time?", searchTerm)}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {highlightMatch("Make sure you've set both an appointment time AND selected the correct stop type. Detention only starts counting after the threshold time has passed.", searchTerm)}
                        </p>
                      </div>
                    )}

                    {(!searchTerm.trim() || matchesSearch("How do I move driver between dispatchers settings gear management edit pencil")) && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          {highlightMatch("Q: How do I move a driver between dispatchers?", searchTerm)}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {highlightMatch("Use the settings gear icon → Driver Management tab → click edit (pencil) next to the driver → change dispatcher in dropdown → save changes.", searchTerm)}
                        </p>
                      </div>
                    )}

                    {(!searchTerm.trim() || matchesSearch("difference between warnings and reminders detention alerts notifications")) && (
                      <div>
                        <h4 className="font-medium text-sm mb-1">
                          {highlightMatch("Q: What's the difference between warnings and reminders?", searchTerm)}
                        </h4>
                        <p className="text-xs text-gray-600">
                          {highlightMatch("Warnings are sent before or when detention starts. Reminders are sent after detention has begun, typically every 30 minutes to keep you informed of ongoing detention costs.", searchTerm)}
                        </p>
                      </div>
                    )}

                    <div>
                      <h4 className="font-medium text-sm mb-1">Q: Can I use dispatchers without any drivers?</h4>
                      <p className="text-xs text-gray-600">
                        Yes! Add standalone dispatchers through settings. When selected, they'll show an empty 
                        driver list until drivers are assigned to them.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-1">Q: How do I create and manage teams?</h4>
                      <p className="text-xs text-gray-600">
                        Use the settings gear icon → Teams tab → Create team with custom name and color → 
                        Assign dispatchers to team. Teams appear in filter dropdown and show combined drivers 
                        from all team members when selected.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-1">Q: What's the difference between team and dispatcher filtering?</h4>
                      <p className="text-xs text-gray-600">
                        Individual dispatcher filtering shows only that dispatcher's drivers. Team filtering 
                        shows drivers from ALL dispatchers assigned to that team, making it easier to manage 
                        multiple dispatchers working together.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-1">Q: Why am I not getting notifications?</h4>
                      <p className="text-xs text-gray-600">
                        Click the bell icon in the header to enable browser notifications. Desktop notifications 
                        appear on ALL tabs and computers when alerts occur. Each computer shows notifications 
                        independently, perfect for multi-computer setups.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-1">Q: Why is my browser tab flashing?</h4>
                      <p className="text-xs text-gray-600">
                        ALL browser tabs flash when you have unread alerts, showing "(X) Dispatcher Helper" 
                        and "🚨 X ALERT(S) 🚨" every 500ms. The favicon alternates between a professional 
                        blue truck icon and the same truck with a red alert badge showing the exact count. 
                        This works consistently across all tabs and computers for maximum visibility. The 
                        flashing stops when you acknowledge alerts.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-medium text-sm mb-1">Q: Why don't I see all alerts when I select a specific dispatcher or team?</h4>
                      <p className="text-xs text-gray-600">
                        All notification channels (desktop alerts, audio alerts, toast notifications, dashboard components) 
                        automatically filter by your selection. Individual dispatcher shows only their driver alerts, 
                        team selection shows alerts from all drivers of team members, and "All" shows everything.
                      </p>
                    </div>
                  </div>
                </div>

                <Separator />

                {(!searchTerm.trim() || matchesSearch("Pro Tip Status sort priority drivers attention critical detention urgent tab flashing alerts dispatcher team filtering")) && (
                  <div className="border rounded-lg p-3 bg-blue-50">
                    <h4 className="font-medium text-sm text-blue-800 mb-1">
                      {highlightMatch("💡 Pro Tip", searchTerm)}
                    </h4>
                    <p className="text-xs text-blue-700">
                      {highlightMatch("Use the Status sort (default) to prioritize drivers needing attention. The system automatically shows critical and detention status first, helping you focus on the most urgent situations. All browser tabs flash when alerts occur - perfect for multi-computer setups. Remember that alerts filter by your dispatcher/team selection - use \"All\" to see everything, individual dispatchers for focused view, or teams to manage multiple dispatchers together.", searchTerm)}
                    </p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* AI ASSISTANT TAB */}
            <TabsContent value="ai-assistant" className="space-y-4 mt-4" style={{ display: searchTerm.trim() && searchTerm.length >= 2 ? 'none' : undefined }}>
              <div className="h-[500px] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Bot className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-purple-800">AI Assistant</h3>
                  </div>
                  {chatMessages.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearChat}
                      className="text-xs"
                    >
                      Clear Chat
                    </Button>
                  )}
                </div>

                {/* Chat Messages Area */}
                <div className="flex-1 border rounded-lg p-4 overflow-y-auto bg-gray-50 mb-4 space-y-3">
                  {chatMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p className="text-sm mb-2">👋 Hi! I'm your AI assistant for Dispatcher Helper.</p>
                      <p className="text-xs mb-3">I support multiple AI providers: OpenAI GPT, Claude, Gemini, Groq, and Perplexity.</p>
                      <p className="text-xs">Ask me anything about using the app:</p>
                      <div className="mt-3 text-xs space-y-1">
                        <div>• "How do I set an appointment time?"</div>
                        <div>• "What are the different stop types?"</div>
                        <div>• "How does detention tracking work?"</div>
                        <div>• "How do I create a team?"</div>
                      </div>
                    </div>
                  ) : (
                    chatMessages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[80%] rounded-lg p-3 ${
                            message.role === 'user'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border text-gray-800'
                          }`}
                        >
                          <div className="text-sm whitespace-pre-wrap">
                            {message.content || 'No content available'}
                          </div>
                          <div
                            className={`text-xs mt-1 opacity-70 ${
                              message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}
                          >
                            <span>{message.timestamp.toLocaleTimeString()}</span>
                            {message.role === 'assistant' && message.provider && (
                              <span className="ml-2 font-medium">• {message.provider}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}

                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="bg-white border rounded-lg p-3 max-w-[80%]">
                        <div className="flex items-center gap-2 text-gray-600">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">AI is thinking...</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {aiError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="text-red-800 text-sm">
                        <strong>Error:</strong> {aiError}
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* AI Provider Selection */}
                <div className="mb-3">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium text-gray-700">AI Model:</label>
                    <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="Select AI provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableProviders.map((provider) => (
                          <SelectItem 
                            key={provider.id} 
                            value={provider.id}
                            disabled={!provider.available}
                            className={!provider.available ? "text-gray-400" : ""}
                          >
                            <div className="flex items-center gap-2">
                              <span>{provider.name}</span>
                              {provider.available ? (
                                <span className="text-green-600">●</span>
                              ) : (
                                <span className="text-gray-400">●</span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="text-xs text-gray-500">
                      ({availableProviders.length} providers)
                    </div>
                  </div>
                </div>

                {/* Input Area */}
                <div className="flex gap-2">
                  <Input
                    ref={chatInputRef}
                    placeholder="Ask me anything about Dispatcher Helper..."
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1"
                  />
                  <Button
                    onClick={sendMessage}
                    disabled={isLoading || !currentMessage.trim()}
                    className="bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    {isLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Footer Info */}
                <div className="text-xs text-center text-gray-500 mt-2">
                  <div>Multi-provider AI assistant supporting OpenAI, Claude, Gemini, Groq, and Perplexity.</div>
                  <div className="mt-1">Green dot (●) indicates available providers.</div>
                </div>
              </div>
            </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}