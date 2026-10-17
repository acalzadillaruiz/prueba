// 051-G · 8: a sideways trackpad gesture turns one photo; a vertical one is never swallowed.
import { describe, expect, it, vi } from "vitest";
import { wheelPager } from "@/lib/useWheelPager";

function strip(width: number, slides: number) {
  let handler: ((e: WheelEvent) => void) | null = null;
  const el = {
    clientWidth: width,
    scrollWidth: width * slides,
    scrollLeft: 0,
    addEventListener: (_: string, h: (e: WheelEvent) => void) => (handler = h),
    removeEventListener: () => (handler = null),
    scrollTo: vi.fn(({ left }: { left: number }) => (el.scrollLeft = left)),
  };
  const wheel = (deltaX: number, deltaY = 0) => {
    const e = { deltaX, deltaY, preventDefault: vi.fn() } as unknown as WheelEvent;
    handler?.(e);
    return e.preventDefault as unknown as ReturnType<typeof vi.fn>;
  };
  return { el, wheel };
}

describe("wheelPager", () => {
  vi.stubGlobal("matchMedia", () => ({ matches: false }));
  let t = 0;
  vi.stubGlobal("performance", { now: () => t });

  it("pages one slide on a short sideways gesture, even when it is far below half a 1440 px slide", () => {
    const { el, wheel } = strip(1440, 3);
    wheelPager(el as unknown as HTMLElement);
    t = 1000;
    for (let i = 0; i < 12; i++) { wheel(8); t += 16; }
    expect(el.scrollTo).toHaveBeenCalledTimes(1);
    expect(el.scrollLeft).toBe(1440);
  });

  it("turns at most one page per gesture (momentum), and again after a pause", () => {
    const { el, wheel } = strip(400, 4);
    wheelPager(el as unknown as HTMLElement);
    t = 5000;
    for (let i = 0; i < 40; i++) { wheel(30); t += 16; }
    expect(el.scrollLeft).toBe(400);
    t += 400;
    wheel(30);
    expect(el.scrollLeft).toBe(800);
  });

  it("never touches a vertical gesture", () => {
    const { el, wheel } = strip(400, 4);
    wheelPager(el as unknown as HTMLElement);
    t = 9000;
    const pd = wheel(2, 40);
    expect(pd).not.toHaveBeenCalled();
    expect(el.scrollTo).not.toHaveBeenCalled();
  });

  it("lets the gesture go at either end", () => {
    const { el, wheel } = strip(400, 2);
    wheelPager(el as unknown as HTMLElement);
    t = 12000;
    expect(wheel(-30)).not.toHaveBeenCalled();
    el.scrollLeft = 400;
    expect(wheel(30)).not.toHaveBeenCalled();
  });
});
