import Navigation from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, Clock, MapPin, Edit, Trash2 } from "lucide-react";
import NewEventModal from "@/components/modals/new-event-modal";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarEvent } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format, isSameDay, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameMonth, addWeeks, subWeeks, startOfDay, endOfDay } from "date-fns";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
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

  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

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

  const goToPreviousWeek = () => {
    setCurrentWeek(subWeeks(currentWeek, 1));
  };

  const goToNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
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
                  {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                </h2>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm" onClick={goToPreviousWeek}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToNextWeek}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
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
                  {weekDays.map(day => {
                    const dayEvents = getEventsForDay(day);
                    return (
                      <div key={day.toISOString()} className={`min-h-32 p-2 border-r border-b ${
                        isToday(day) ? 'bg-blue-50' : 'bg-white'
                      }`}>
                        <div className={`text-sm font-medium mb-1 ${
                          isToday(day) ? 'text-blue-600' : 'text-gray-900'
                        }`}>
                          {format(day, 'd')}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.map(event => (
                            <div
                              key={event.id}
                              className="text-xs p-1 bg-blue-100 text-blue-800 rounded truncate cursor-pointer hover:bg-blue-200"
                              title={event.title}
                            >
                              {event.allDay ? event.title : `${format(new Date(event.startDate), 'HH:mm')} ${event.title}`}
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
                        <h3 className="font-medium text-sm">{event.title}</h3>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => deleteEventMutation.mutate(event.id)}
                            disabled={deleteEventMutation.isPending}
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
                      {event.allDay && (
                        <Badge variant="secondary" className="mt-2 text-xs">
                          All Day
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}