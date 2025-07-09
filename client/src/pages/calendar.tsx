import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Edit, Trash2, Check, X } from "lucide-react";
import NewEventModal from "@/components/modals/new-event-modal";
import EditEventModal from "@/components/modals/edit-event-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth, addWeeks, subWeeks, startOfDay, endOfDay, startOfMonth, endOfMonth, eachWeekOfInterval, addDays, subDays, addMonths, subMonths } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type CalendarView = 'month' | '2week' | 'week';

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>('month');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<CalendarEvent[]>({
    queryKey: ['/api/calendar-events'],
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: number) => {
      return apiRequest("DELETE", `/api/calendar-events/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
      toast({
        title: "Event deleted",
        description: "The calendar event has been deleted successfully.",
      });
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast({
        title: "Error",
        description: "Failed to delete calendar event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleEventCompletionMutation = useMutation({
    mutationFn: async ({ eventId, completed }: { eventId: number; completed: boolean }) => {
      return apiRequest("PATCH", `/api/calendar-events/${eventId}`, { completed });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar-events'] });
      toast({
        title: "Event updated",
        description: "Event completion status has been updated.",
      });
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast({
        title: "Error",
        description: "Failed to update event. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Calculate date ranges based on current view
  const getDateRange = () => {
    switch (calendarView) {
      case 'month':
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        return {
          start: startOfWeek(monthStart, { weekStartsOn: 1 }),
          end: endOfWeek(monthEnd, { weekStartsOn: 1 })
        };
      case '2week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        return {
          start: weekStart,
          end: endOfWeek(addWeeks(weekStart, 1), { weekStartsOn: 1 })
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
      default:
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 })
        };
    }
  };

  const { start: rangeStart, end: rangeEnd } = getDateRange();
  const calendarDays = eachDayOfInterval({ start: rangeStart, end: rangeEnd });

  const getEventsForDay = (date: Date) => {
    return events.filter(event => {
      const eventStart = new Date(event.startDate);
      const eventEnd = new Date(event.endDate);
      return (
        isSameDay(eventStart, date) ||
        isSameDay(eventEnd, date) ||
        (eventStart <= date && eventEnd >= date)
      );
    });
  };

  const upcomingEvents = events
    .filter(event => new Date(event.startDate) >= new Date())
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    .slice(0, 5);

  const goToPrevious = () => {
    switch (calendarView) {
      case 'month':
        setCurrentDate(subMonths(currentDate, 1));
        break;
      case '2week':
        setCurrentDate(subWeeks(currentDate, 2));
        break;
      case 'week':
        setCurrentDate(subWeeks(currentDate, 1));
        break;
    }
  };

  const goToNext = () => {
    switch (calendarView) {
      case 'month':
        setCurrentDate(addMonths(currentDate, 1));
        break;
      case '2week':
        setCurrentDate(addWeeks(currentDate, 2));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, 1));
        break;
    }
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getViewTitle = () => {
    switch (calendarView) {
      case 'month':
        return format(currentDate, 'MMMM yyyy');
      case '2week':
        const twoWeekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const twoWeekEnd = endOfWeek(addWeeks(twoWeekStart, 1), { weekStartsOn: 1 });
        return `${format(twoWeekStart, 'MMM d')} - ${format(twoWeekEnd, 'MMM d, yyyy')}`;
      case 'week':
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
        return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
      default:
        return '';
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setEditModalOpen(true);
  };

  const handleToggleCompletion = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    toggleEventCompletionMutation.mutate({ eventId: event.id, completed: !event.completed });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Navigation />
      
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
          <NewEventModal />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  {getViewTitle()}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={goToPrevious}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNext}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* View Toggle Buttons */}
              <div className="flex items-center justify-center space-x-1 mb-4">
                <Button
                  variant={calendarView === 'month' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCalendarView('month')}
                >
                  Month
                </Button>
                <Button
                  variant={calendarView === '2week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCalendarView('2week')}
                >
                  2 Weeks
                </Button>
                <Button
                  variant={calendarView === 'week' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCalendarView('week')}
                >
                  Week
                </Button>
              </div>
              
              {isLoading ? (
                <div className="text-center py-16">
                  <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading calendar...</p>
                </div>
              ) : (
                <div className="grid grid-cols-7 gap-1">
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <div key={day} className="p-2 text-center text-sm font-medium text-gray-500 border-b">
                      {day}
                    </div>
                  ))}
                  {calendarDays.map(day => {
                    const dayEvents = getEventsForDay(day);
                    const isCurrentMonth = calendarView === 'month' ? isSameMonth(day, currentDate) : true;
                    return (
                      <div key={day.toISOString()} className={cn(
                        "min-h-32 p-2 border-r border-b",
                        isToday(day) ? 'bg-blue-50' : 'bg-white',
                        !isCurrentMonth && 'bg-gray-50'
                      )}>
                        <div className={cn(
                          "text-sm font-medium mb-1",
                          isToday(day) ? 'text-blue-600' : 'text-gray-900',
                          !isCurrentMonth && 'text-gray-400'
                        )}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map(event => (
                            <div
                              key={event.id}
                              className={cn(
                                "text-xs p-1 rounded truncate cursor-pointer group relative",
                                event.completed 
                                  ? "bg-green-100 text-green-800 hover:bg-green-200" 
                                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                              )}
                              onClick={() => handleEventClick(event)}
                              title={event.title}
                            >
                              <div className="flex items-center justify-between">
                                <span className={cn(
                                  "flex-1 truncate",
                                  event.completed && "line-through"
                                )}>
                                  {event.allDay ? event.title : `${format(new Date(event.startDate), 'HH:mm')} ${event.title}`}
                                </span>
                                <button
                                  onClick={(e) => handleToggleCompletion(event, e)}
                                  className="opacity-0 group-hover:opacity-100 ml-1 p-0.5 hover:bg-white hover:bg-opacity-20 rounded"
                                  title={event.completed ? "Mark as incomplete" : "Mark as completed"}
                                >
                                  {event.completed ? (
                                    <X className="h-2 w-2" />
                                  ) : (
                                    <Check className="h-2 w-2" />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold mb-4">Upcoming Events</h2>
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-8">
                  <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">No upcoming events</p>
                  <p className="text-sm text-gray-400">Schedule events to see them here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {upcomingEvents.map(event => (
                    <div key={event.id} className="p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className={cn(
                          "font-medium text-sm",
                          event.completed ? "text-green-600 line-through" : "text-gray-900"
                        )}>{event.title}</h3>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleEventClick(event)}
                            title="Edit event"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => deleteEventMutation.mutate(event.id)}
                            disabled={deleteEventMutation.isPending}
                            title="Delete event"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      {event.description && (
                        <p className="text-xs text-gray-600 mb-2">{event.description}</p>
                      )}
                      <div className="flex items-center text-xs text-gray-500 space-x-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          {event.allDay 
                            ? format(new Date(event.startDate), 'MMM d, yyyy') 
                            : `${format(new Date(event.startDate), 'MMM d, HH:mm')} - ${format(new Date(event.endDate), 'HH:mm')}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        {event.allDay && (
                          <Badge variant="secondary" className="text-xs">
                            All Day
                          </Badge>
                        )}
                        {event.completed && (
                          <Badge variant="secondary" className="text-xs">
                            Completed
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      
      {/* Edit Event Modal */}
      {selectedEvent && (
        <EditEventModal
          event={selectedEvent}
          open={editModalOpen}
          onOpenChange={setEditModalOpen}
        />
      )}
    </div>
  );
}