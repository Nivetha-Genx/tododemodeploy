import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const BottomSheet = DialogPrimitive.Root

const BottomSheetTrigger = DialogPrimitive.Trigger

const BottomSheetPortal = DialogPrimitive.Portal

const BottomSheetClose = DialogPrimitive.Close

const BottomSheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
BottomSheetOverlay.displayName = DialogPrimitive.Overlay.displayName

interface BottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> {
  showCloseButton?: boolean
}

const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  BottomSheetContentProps
>(({ className, children, showCloseButton = true, ...props }, ref) => (
  <BottomSheetPortal>
    <BottomSheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        "fixed z-50 gap-4 bg-white p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        "inset-x-0 bottom-0 border-t border-gray-200 rounded-t-2xl md:max-w-md md:left-1/2 md:-translate-x-1/2 md:rounded-2xl md:border md:bottom-4",
        className
      )}
      {...props}
    >
      {showCloseButton && (
        <div className="flex justify-center mb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>
      )}
      {children}
    </DialogPrimitive.Content>
  </BottomSheetPortal>
))
BottomSheetContent.displayName = DialogPrimitive.Content.displayName

interface BottomSheetHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  showBackButton?: boolean
  onBack?: () => void
}

const BottomSheetHeader = ({
  className,
  showBackButton = false,
  onBack,
  ...props
}: BottomSheetHeaderProps) => (
  <div
    className={cn(
      "flex items-center space-y-1.5 relative w-full",
      showBackButton && "px-10",
      className
    )}
    {...props}
  >
    {showBackButton && (
      <DialogPrimitive.Close
        onClick={onBack}
        className="absolute left-0 top-1/2 -translate-y-1/2 rounded-sm opacity-70 ring-offset-white transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-950 focus:ring-offset-2 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-5 w-5" />
        <span className="sr-only">Back</span>
      </DialogPrimitive.Close>
    )}
    {props.children}
  </div>
)
BottomSheetHeader.displayName = "BottomSheetHeader"

const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-semibold leading-none tracking-tight flex-1 text-center",
      className
    )}
    {...props}
  />
))
BottomSheetTitle.displayName = DialogPrimitive.Title.displayName

const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-gray-500", className)}
    {...props}
  />
))
BottomSheetDescription.displayName = DialogPrimitive.Description.displayName

export {
  BottomSheet,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetHeader,
  BottomSheetTitle,
  BottomSheetDescription,
  BottomSheetClose,
}

