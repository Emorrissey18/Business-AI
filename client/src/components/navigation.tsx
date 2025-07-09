import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { GripVertical } from "lucide-react";

interface NavigationItem {
  id: string;
  href: string;
  label: string;
}

const defaultNavigationItems: NavigationItem[] = [
  { id: "assistant", href: "/", label: "Assistant" },
  { id: "documents", href: "/documents", label: "Documents" },
  { id: "goals", href: "/goals", label: "Goals" },
  { id: "tasks", href: "/tasks", label: "Tasks" },
  { id: "calendar", href: "/calendar", label: "Calendar" },
  { id: "financials", href: "/financials", label: "Financials" },
  { id: "business-context", href: "/business-context", label: "Business Context" },
  { id: "insights", href: "/insights", label: "AI Insights" },
];

export default function Navigation() {
  const [location] = useLocation();
  const [navigationItems, setNavigationItems] = useState<NavigationItem[]>(defaultNavigationItems);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [isCustomizing, setIsCustomizing] = useState(false);

  // Load saved order from localStorage
  useEffect(() => {
    const savedOrder = localStorage.getItem('navigationOrder');
    if (savedOrder) {
      try {
        const orderIds = JSON.parse(savedOrder);
        const reorderedItems = orderIds.map((id: string) => 
          defaultNavigationItems.find(item => item.id === id)
        ).filter(Boolean);
        setNavigationItems(reorderedItems);
      } catch (error) {
        console.error('Failed to load navigation order:', error);
      }
    }
  }, []);

  // Save order to localStorage
  const saveOrder = (items: NavigationItem[]) => {
    const orderIds = items.map(item => item.id);
    localStorage.setItem('navigationOrder', JSON.stringify(orderIds));
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem === targetId) return;

    const newItems = [...navigationItems];
    const draggedIndex = newItems.findIndex(item => item.id === draggedItem);
    const targetIndex = newItems.findIndex(item => item.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    // Remove dragged item and insert at target position
    const [draggedItemObj] = newItems.splice(draggedIndex, 1);
    newItems.splice(targetIndex, 0, draggedItemObj);

    setNavigationItems(newItems);
    saveOrder(newItems);
    setDraggedItem(null);
  };

  const resetOrder = () => {
    setNavigationItems(defaultNavigationItems);
    localStorage.removeItem('navigationOrder');
  };

  return (
    <nav className="mb-8">
      <div className="border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              {isCustomizing ? 'Done Customizing' : 'Customize Tabs'}
            </button>
            {isCustomizing && (
              <button
                onClick={resetOrder}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Reset Order
              </button>
            )}
          </div>
        </div>
        <ul className="flex space-x-8">
          {navigationItems.map((item) => (
            <li 
              key={item.id}
              draggable={isCustomizing}
              onDragStart={(e) => handleDragStart(e, item.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, item.id)}
              className={cn(
                "relative",
                isCustomizing && "cursor-move",
                draggedItem === item.id && "opacity-50"
              )}
            >
              <div className="flex items-center">
                {isCustomizing && (
                  <GripVertical className="h-3 w-3 text-gray-400 mr-1" />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "py-2 px-1 border-b-2 font-medium transition-colors flex items-center",
                    location === item.href
                      ? "border-primary text-primary"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                    isCustomizing && "pointer-events-none"
                  )}
                >
                  {item.label}
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
