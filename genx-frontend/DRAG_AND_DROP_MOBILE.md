# Mobile Drag and Drop Implementation

## Overview
This implementation provides a mobile-friendly drag-and-drop experience for the Kanban board that distinguishes between scrolling gestures and drag gestures.

## Key Features

### 1. Long Press Activation (600ms)
- Cards require a **600ms hold** before becoming draggable
- Prevents accidental drags when users just want to scroll
- Matches the delay configured in `TouchSensor`

### 2. Visual Feedback
- After **300ms** of holding, a blue ring appears around the card
- Card slightly scales up (`scale-[1.02]`) to indicate it's ready to drag
- Provides clear visual indication that drag mode is activating

### 3. Swipe Detection
- If user moves more than **20px** during the hold period, drag is cancelled
- This allows normal scrolling to work
- Movement detection uses Euclidean distance: `√(Δx² + Δy²)`

### 4. Touch Action CSS
- `touch-pan-y`: Allows vertical scrolling when not dragging
- `touch-none`: Prevents all touch actions when dragging to avoid conflicts

## Implementation Details

### TouchSensor Configuration
```typescript
useSensor(TouchSensor, {
    activationConstraint: {
        delay: 600,      // 600ms delay before drag activates
        tolerance: 15,   // Allow 15px movement tolerance
    },
})
```

### Visual Feedback Logic
- Touch start: Record initial position
- 300ms: Show blue ring and scale effect
- Movement >20px: Cancel feedback, allow scrolling
- 600ms: Drag activates (handled by dnd-kit)

### Event Flow
1. User touches card
2. Timer starts (300ms for visual, 600ms for drag)
3. If movement detected >20px → Cancel drag, allow scroll
4. If held still for 600ms → Drag activates
5. During drag: `touch-none` prevents scrolling
6. After drag: Reset all states

## Files Modified

1. **BoardView.tsx**
   - Added touch event handlers for visual feedback
   - Integrated TouchSensor with delay
   - Added movement detection logic
   - CSS classes for touch-action management

2. **useLongPressDrag.ts** (created but not used in final implementation)
   - Custom hook for long press detection (available for other components)

## Usage Tips

### For Users
- **To drag**: Hold a card for 600ms, then move it
- **To scroll**: Simply swipe normally (no hold needed)
- **Visual cue**: Blue ring appears when card is ready to drag

### For Developers
- Adjust `delay` (600ms) to change hold time requirement
- Adjust `tolerance` (15px) for movement sensitivity
- Adjust feedback timer (300ms) for when visual appears
- Adjust movement threshold (20px) for scroll detection

## Browser Compatibility
- Works on all modern mobile browsers (iOS Safari, Chrome Mobile, etc.)
- Desktop experience unchanged (uses PointerSensor with 8px distance)

