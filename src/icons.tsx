import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement> & { size?: number }
const makeIcon = () => function Icon({ size = 20, ...props }: IconProps) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
}
export const ArrowRight = makeIcon(); export const Bell = makeIcon(); export const CalendarDays = makeIcon(); export const Check = makeIcon(); export const ChevronDown = makeIcon(); export const CircleHelp = makeIcon(); export const Copy = makeIcon(); export const Ellipsis = makeIcon(); export const Flame = makeIcon(); export const LayoutDashboard = makeIcon(); export const LineChart = makeIcon(); export const LoaderCircle = makeIcon(); export const MoreHorizontal = makeIcon(); export const Plus = makeIcon(); export const Search = makeIcon(); export const Send = makeIcon(); export const Settings = makeIcon(); export const Sparkles = makeIcon(); export const Target = makeIcon(); export const TrendingUp = makeIcon(); export const Users = makeIcon(); export const WandSparkles = makeIcon(); export const X = makeIcon(); export const Command = makeIcon(); export const Clock3 = makeIcon();
