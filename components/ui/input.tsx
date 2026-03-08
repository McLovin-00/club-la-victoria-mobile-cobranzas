import * as React from "react";
import { TextInput, View, Text, type TextInputProps } from "react-native";
import { cn } from "../../lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  /** Additional accessibility hint beyond helperText. */
  accessibilityHint?: string;
}

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  ({ className, label, error, helperText, leftIcon, accessibilityHint, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    const hasError = !!error;

    // Build accessibility label from label and error
    const computedAccessibilityLabel = [
      label,
      hasError ? `Error: ${error}` : null,
    ].filter(Boolean).join('. ');

    // Build accessibility hint from helper text
    const computedAccessibilityHint = accessibilityHint ?? helperText;

    return (
      <View className="gap-1.5">
        {label && (
          <Text
            className="text-sm font-semibold text-foreground ml-1"
            accessibilityRole="header"
          >
            {label}
          </Text>
        )}
        <View
          className={cn(
            "flex-row items-center h-14 w-full rounded-xl border-2 px-4 transition-colors",
            isFocused && !hasError ? "border-primary bg-primary/5" : "border-border bg-background",
            hasError ? "border-destructive bg-destructive/5" : "",
            className
          )}
        >
        {leftIcon && <View className="mr-2" accessibilityElementsHidden>{leftIcon}</View>}
        <TextInput
          ref={ref}
          className={cn(
            "flex-1 text-base text-foreground",
            "placeholder:text-muted-foreground"
          )}
          placeholderTextColor="hsl(0, 0%, 45%)"
          accessibilityLabel={computedAccessibilityLabel || props.placeholder}
          accessibilityHint={computedAccessibilityHint}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
        {error && (
          <Text
            className="text-sm font-medium text-destructive ml-1"
            accessibilityRole="alert"
            accessibilityLiveRegion="assertive"
          >
            {error}
          </Text>
        )}
        {helperText && !error && (
          <Text className="text-sm text-muted-foreground ml-1">{helperText}</Text>
        )}
      </View>
    );
  }
);
Input.displayName = "Input";

export { Input };
