// src/components/CalendarView.jsx
// Monthly calendar grid showing events as colored pills.
// Navigation: prev/next month + "Heute" button.

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  // Monday-first: 0=Mo … 6=So
  const d = new Date(year, month, 1).getDay(); // 0=Su … 6=Sa
  return d === 0 ? 6 : d - 1;
}

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const MONTH_NAMES = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

function isoDate(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CalendarView({ events = [], onEventClick }) {
  const today = new Date();
  const [year, setYear]   = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };
  const goToday = () => { setYear(today.getFullYear()); setMonth(today.getMonth()); };

  const daysInMonth  = getDaysInMonth(year, month);
  const firstWeekDay = getFirstDayOfWeek(year, month);

  // Map ISO date → events[]
  const byDate = {};
  for (const ev of events) {
    if (ev.event_date) {
      if (!byDate[ev.event_date]) byDate[ev.event_date] = [];
      byDate[ev.event_date].push(ev);
    }
  }

  const todayStr = isoDate(today.getFullYear(), today.getMonth(), today.getDate());

  // Build grid cells: leading empty cells + day cells
  const cells = [];
  for (let i = 0; i < firstWeekDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="calendar-wrap">
      {/* Header */}
      <div className="calendar-nav">
        <button className="btn btn-ghost btn-sm" onClick={prevMonth}>‹</button>
        <span className="calendar-title">{MONTH_NAMES[month]} {year}</span>
        <button className="btn btn-ghost btn-sm" onClick={nextMonth}>›</button>
        <button className="btn btn-ghost btn-sm" onClick={goToday} style={{ marginLeft: '.5rem' }}>
          Heute
        </button>
      </div>

      {/* Grid */}
      <div className="calendar-grid">
        {WEEKDAYS.map(wd => (
          <div key={wd} className="calendar-weekday">{wd}</div>
        ))}
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="calendar-cell calendar-cell--empty" />;
          const dateStr = isoDate(year, month, day);
          const dayEvents = byDate[dateStr] || [];
          const isToday = dateStr === todayStr;
          return (
            <div key={dateStr} className={`calendar-cell${isToday ? ' calendar-cell--today' : ''}`}>
              <span className={`calendar-day-num${isToday ? ' calendar-day-num--today' : ''}`}>
                {day}
              </span>
              {dayEvents.slice(0, 3).map(ev => (
                <div
                  key={ev.id}
                  className="calendar-event-pill"
                  onClick={() => onEventClick && onEventClick(ev.id)}
                  title={`${ev.title}${ev.start_time ? ` · ${ev.start_time}` : ''}`}
                >
                  {ev.title}
                </div>
              ))}
              {dayEvents.length > 3 && (
                <div className="calendar-more">+{dayEvents.length - 3} weitere</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
