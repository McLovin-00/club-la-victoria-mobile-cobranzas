import * as React from "react";
import { View, Text, Image, type ViewProps, type ImageSourcePropType } from "react-native";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const avatarVariants = cva(
  "rounded-full items-center justify-center bg-muted",
  {
    variants: {
      size: {
        sm: "w-8 h-8",
        default: "w-10 h-10",
        lg: "w-14 h-14",
        xl: "w-20 h-20",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
);

const avatarTextVariants = cva("font-semibold text-foreground", {
  variants: {
    size: {
      sm: "text-xs",
      default: "text-sm",
      lg: "text-lg",
      xl: "text-2xl",
    },
  },
  defaultVariants: {
    size: "default",
  },
});

export interface AvatarProps extends ViewProps, VariantProps<typeof avatarVariants> {
  initials: string;
  source?: ImageSourcePropType;
  /** Accessibility label describing the person. Defaults to initials. */
  accessibilityLabel?: string;
}

const Avatar = React.forwardRef<React.ElementRef<typeof View>, AvatarProps>(
  ({ className, size, initials, source, accessibilityLabel, ...props }, ref) => {
    const [imageError, setImageError] = React.useState(false);

    React.useEffect(() => {
      setImageError(false);
    }, [source]);
    const showImage = source && !imageError;

    return (
      <View
        ref={ref}
        className={cn(avatarVariants({ size, className }))}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel ?? `Avatar: ${initials}`}
        {...props}
      >
        {showImage ? (
          <Image
            source={source}
            className={cn("w-full h-full rounded-full")}
            resizeMode="cover"
            onError={() => setImageError(true)}
            accessibilityElementsHidden
          />
        ) : (
          <Text className={cn(avatarTextVariants({ size }))} accessibilityElementsHidden>
            {initials.slice(0, 2).toUpperCase()}
          </Text>
        )}
      </View>
    );
  }
);
  Avatar.displayName = "Avatar";

export { Avatar, avatarVariants, avatarTextVariants };
