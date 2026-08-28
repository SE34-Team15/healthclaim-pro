import * as React from 'react';
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react';
import { DayButton, DayPicker, getDefaultClassNames } from 'react-day-picker';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'label',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker> & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant'];
}) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-white group/calendar p-3 [--cell-size:2.25rem] rounded-2xl select-none',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString('default', { month: 'short' }),
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit', defaultClassNames.root),
        months: cn(
          'relative flex flex-col gap-4 md:flex-row',
          defaultClassNames.months
        ),
        month: cn('flex w-full flex-col gap-3', defaultClassNames.month),
        nav: cn(
          'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1 z-10',
          defaultClassNames.nav
        ),
        button_previous: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 select-none p-0 border-slate-200 hover:bg-slate-100 rounded-lg',
          defaultClassNames.button_previous
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline' }),
          'h-7 w-7 select-none p-0 border-slate-200 hover:bg-slate-100 rounded-lg',
          defaultClassNames.button_next
        ),
        month_caption: cn(
          'flex h-7 w-full items-center justify-center text-xs font-bold text-slate-900',
          defaultClassNames.month_caption
        ),
        dropdowns: cn(
          'flex h-7 w-full items-center justify-center gap-1.5 text-xs font-semibold',
          defaultClassNames.dropdowns
        ),
        dropdown_root: cn(
          'relative rounded-md border border-slate-200 shadow-2xs',
          defaultClassNames.dropdown_root
        ),
        dropdown: cn(
          'absolute inset-0 opacity-0 bg-white',
          defaultClassNames.dropdown
        ),
        caption_label: cn(
          'select-none text-xs font-bold text-slate-900',
          defaultClassNames.caption_label
        ),
        month_grid: cn('w-full border-collapse', defaultClassNames.month_grid),
        weekdays: cn('flex justify-between', defaultClassNames.weekdays),
        weekday: cn(
          'text-slate-400 flex-1 select-none rounded-md text-[10px] font-bold uppercase text-center',
          defaultClassNames.weekday
        ),
        week: cn('mt-1.5 flex w-full justify-between gap-1', defaultClassNames.week),
        week_number_header: cn(
          'w-[--cell-size] select-none text-slate-400 text-[10px]',
          defaultClassNames.week_number_header
        ),
        week_number: cn(
          'text-slate-400 select-none text-[10px]',
          defaultClassNames.week_number
        ),
        day: cn(
          'group/day relative aspect-square h-8 w-8 select-none p-0 text-center flex items-center justify-center',
          defaultClassNames.day
        ),
        range_start: cn(
          'bg-slate-900 text-white rounded-l-lg font-bold',
          defaultClassNames.range_start
        ),
        range_middle: cn('bg-slate-100 text-slate-900 rounded-none', defaultClassNames.range_middle),
        range_end: cn('bg-slate-900 text-white rounded-r-lg font-bold', defaultClassNames.range_end),
        today: cn(
          'font-bold text-indigo-600',
          defaultClassNames.today
        ),
        outside: cn(
          'text-slate-300 opacity-40',
          defaultClassNames.outside
        ),
        disabled: cn(
          'text-slate-200 opacity-30 cursor-not-allowed',
          defaultClassNames.disabled
        ),
        hidden: cn('invisible', defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === 'left') {
            return (
              <ChevronLeftIcon className={cn('size-3.5 text-slate-600', className)} {...props} />
            );
          }

          if (orientation === 'right') {
            return (
              <ChevronRightIcon
                className={cn('size-3.5 text-slate-600', className)}
                {...props}
              />
            );
          }

          return (
            <ChevronDownIcon className={cn('size-3.5 text-slate-600', className)} {...props} />
          );
        },
        DayButton: CalendarDayButton,
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  ...props
}: React.ComponentProps<typeof DayButton>) {
  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSelected = modifiers.selected;
  const isToday = modifiers.today;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString()}
      className={cn(
        'h-8 w-8 rounded-lg text-xs font-medium transition-colors flex items-center justify-center p-0',
        isSelected
          ? '!bg-[#0a2540] !text-white !font-bold shadow-xs hover:!bg-[#0a2540] hover:!text-white focus:!bg-[#0a2540]'
          : isToday
          ? 'bg-slate-100 text-indigo-700 font-bold border border-indigo-200 hover:bg-slate-200'
          : 'text-slate-800 hover:bg-slate-100 hover:text-slate-950',
        className
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
