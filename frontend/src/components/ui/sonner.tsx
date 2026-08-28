import { Toaster as Sonner } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:shadow-lg group-[.toaster]:rounded-2xl text-xs font-semibold p-4 border transition-all flex items-center gap-3',
          description: 'group-[.toast]:text-slate-500 text-xs font-normal mt-0.5',
          actionButton:
            'group-[.toast]:bg-[#0a2540] group-[.toast]:text-white text-xs font-semibold px-3 py-1.5 rounded-lg',
          cancelButton:
            'group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 text-xs font-medium px-3 py-1.5 rounded-lg',
          success:
            '!bg-emerald-50/95 !text-emerald-950 !border-emerald-200 shadow-emerald-500/5 [&>[data-icon]]:!text-emerald-600',
          error:
            '!bg-rose-50/95 !text-rose-950 !border-rose-200 shadow-rose-500/5 [&>[data-icon]]:!text-rose-600',
          warning:
            '!bg-amber-50/95 !text-amber-950 !border-amber-200 shadow-amber-500/5 [&>[data-icon]]:!text-amber-600',
          info:
            '!bg-sky-50/95 !text-sky-950 !border-sky-200 shadow-sky-500/5 [&>[data-icon]]:!text-sky-600',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
