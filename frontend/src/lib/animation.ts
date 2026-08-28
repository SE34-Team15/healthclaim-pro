import gsap from 'gsap';

/**
 * Cohesive page entrance animation connecting headers, metric cards, and lists.
 */
export function animatePageEntrance(container: HTMLElement | null) {
  if (!container) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  // 1. Header reveal
  const header = container.querySelector('.anim-header');
  if (header) {
    tl.fromTo(
      header,
      { opacity: 0, y: -8 },
      { opacity: 1, y: 0, duration: 0.35 },
    );
  }

  // 2. Cohesive connected staggered cards
  const cards = container.querySelectorAll('.anim-card');
  if (cards.length > 0) {
    tl.fromTo(
      cards,
      { opacity: 0, y: 12, scale: 0.99 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.4,
        stagger: 0.06,
      },
      '-=0.2',
    );
  }

  // 3. Progress bars fill smoothly
  const progressBars = container.querySelectorAll('.anim-progress');
  if (progressBars.length > 0) {
    progressBars.forEach((bar) => {
      const targetWidth = (bar as HTMLElement).dataset.targetWidth || '100%';
      tl.fromTo(
        bar,
        { width: '0%' },
        { width: targetWidth, duration: 0.6, ease: 'power2.out' },
        '-=0.3',
      );
    });
  }

  return tl;
}

/**
 * Smooth GSAP counter for animating currency / numerical values
 */
export function animateNumber(
  element: HTMLElement | null,
  targetValue: number,
  prefix: string = '$',
  decimals: number = 2,
) {
  if (!element) return;

  const obj = { val: 0 };
  gsap.to(obj, {
    val: targetValue,
    duration: 0.65,
    ease: 'power2.out',
    onUpdate: () => {
      element.textContent = `${prefix}${obj.val.toLocaleString('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}`;
    },
  });
}
