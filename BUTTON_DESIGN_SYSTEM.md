# Button Design System

## Overview

The application now uses a standardized button component across all User and Admin UIs. This ensures consistency and creates a professional, cohesive experience.

## Design Philosophy

### Default Buttons (Standard Actions)
- **Gray background** (gray-700) that's not fully black
- **Compact sizing** with comfortable padding
- **Hover state** transitions to darker gray (gray-800) with shadow
- **Arrow icon** support for forward actions with smooth animation
- Examples: "Continue", "Next", "Map Product", "Populate Template"

### Primary Buttons (Final CTAs)
- **Brand gradient** (red-500 to pink-600)
- Used for **final actions** in a flow
- Examples: "Save Changes", "Apply", "Submit", "Confirm Payment"
- Should be used sparingly to draw attention to the most important action

## Component Usage

### Import
```tsx
import Button from '@/components/Button';
```

### Basic Examples

#### Default Button (Standard Action)
```tsx
<Button>
  Continue
</Button>
```

#### Default Button with Arrow
```tsx
<Button showArrow>
  Next Step
</Button>
```

#### Primary Button (Final CTA)
```tsx
<Button variant="primary">
  Save Changes
</Button>
```

#### Button with Loading State
```tsx
<Button loading={isLoading}>
  Processing...
</Button>
```

#### Secondary/Outline Button
```tsx
<Button variant="secondary">
  Cancel
</Button>
```

#### Danger Button
```tsx
<Button variant="danger">
  Delete Account
</Button>
```

#### Ghost Button
```tsx
<Button variant="ghost">
  Skip
</Button>
```

### Sizes
```tsx
<Button size="sm">Small</Button>
<Button size="md">Medium (Default)</Button>
<Button size="lg">Large</Button>
```

### With Icons
```tsx
import { Save, ArrowLeft } from 'lucide-react';

// Left icon
<Button icon={<Save className="w-4 h-4" />} iconPosition="left">
  Save
</Button>

// Right icon
<Button icon={<ArrowLeft className="w-4 h-4" />} iconPosition="right">
  Go Back
</Button>
```

### Real-World Examples

#### Modal Footer (Standard → Primary Pattern)
```tsx
{/* Standard action: gray with arrow */}
<Button showArrow onClick={handleNext}>
  Continue to Review
</Button>

{/* Final action: brand gradient */}
<Button variant="primary" onClick={handleSubmit}>
  Confirm & Submit
</Button>
```

#### Multi-Step Form
```tsx
{/* Step 1: Continue */}
<Button showArrow onClick={nextStep}>
  Continue
</Button>

{/* Step 2: Continue */}
<Button showArrow onClick={nextStep}>
  Continue
</Button>

{/* Final Step: Primary CTA */}
<Button variant="primary" onClick={handleComplete}>
  Complete Setup
</Button>
```

#### Product Management
```tsx
{/* Standard actions */}
<Button showArrow onClick={handleMapProduct}>
  Map Product
</Button>

<Button showArrow onClick={handleSelectVariants}>
  Select Variants
</Button>

{/* Final action */}
<Button variant="primary" onClick={handleSaveProduct}>
  Save Product
</Button>
```

## Props API

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'default' \| 'primary' \| 'secondary' \| 'danger' \| 'ghost' \| 'outline'` | `'default'` | Visual style variant |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` | Button size |
| `loading` | `boolean` | `false` | Shows loading spinner |
| `showArrow` | `boolean` | `false` | Shows arrow icon with animation |
| `icon` | `ReactNode` | - | Custom icon element |
| `iconPosition` | `'left' \| 'right'` | `'left'` | Icon position |
| `fullWidth` | `boolean` | `false` | Makes button full width |
| `disabled` | `boolean` | `false` | Disables button |

## Variant Guide

### When to Use Each Variant

1. **default** - Most common actions
   - Navigation between steps
   - Opening modals/dialogs
   - Initiating processes
   - Standard CRUD operations (except final save)

2. **primary** - Final actions in a flow
   - Saving changes
   - Submitting forms
   - Confirming important actions
   - Completing multi-step processes

3. **secondary** - Alternative/Cancel actions
   - Cancel buttons
   - Alternative options
   - Less important actions

4. **danger** - Destructive actions
   - Delete operations
   - Permanent removal
   - Irreversible actions

5. **ghost** - Subtle actions
   - Skip buttons
   - Tertiary actions
   - Less prominent options

6. **outline** - Secondary emphasis
   - Filter buttons
   - Toggle options
   - Secondary navigation

## Animation Details

The arrow animation on hover adds a delightful micro-interaction:
- Translates 0.5 pixels to the right
- Smooth transition timing
- Only triggers on hover (group-hover)
- Works automatically with `showArrow` prop

## Accessibility

All buttons include:
- Proper focus states with ring
- Disabled state styling
- Loading state indication
- Keyboard navigation support
- ARIA-compliant markup

## Migration Guide

### Old Pattern
```tsx
<button className="px-6 py-2.5 bg-gradient-to-r from-red-500 to-pink-600...">
  Save Changes
</button>
```

### New Pattern
```tsx
<Button variant="primary">
  Save Changes
</Button>
```

### Benefits
- Consistent styling across app
- Built-in accessibility
- Loading states
- Icon support
- Hover animations
- Less code to write
- Easier to maintain

## Best Practices

1. **Use default for most actions** - Reserve primary for final CTAs
2. **One primary button per screen** - Don't dilute attention
3. **Add arrows for forward actions** - Helps with flow understanding
4. **Use loading states** - Always show feedback for async operations
5. **Keep labels concise** - Action-oriented text (verb + noun)
6. **Disable during processing** - Prevent double-clicks
7. **Consistent sizing** - Stick to md unless specific need for sm/lg

## Examples in Codebase

- `src/components/chat/ScenarioTemplateModal.tsx` - Template modal footer
- `src/components/quotes/ShopifyProductPicker.tsx` - Map Product button
- New components should use this standardized Button

## Dark Mode Support

All button variants have proper dark mode styling built-in:
- Adjusted colors for dark backgrounds
- Proper contrast ratios
- Smooth transitions between modes
