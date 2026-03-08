import { Pressable, useColorScheme } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { cn } from "../../lib/utils";

interface ScreenBackButtonProps {
  onPress: () => void;
  tone?: "default" | "light";
  className?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
}

export function ScreenBackButton({
  onPress,
  tone = "default",
  className,
  accessibilityLabel = "Volver",
  accessibilityHint = "Regresa a la pantalla anterior",
}: ScreenBackButtonProps) {
  const colorScheme = useColorScheme();
  const isLight = tone === "light";
  const defaultIconColor = colorScheme === "dark" ? "hsl(0, 0%, 95%)" : "hsl(0, 0%, 10%)";

  return (
    <Pressable
      onPress={onPress}
      className={cn(
        "h-11 w-11 items-center justify-center rounded-2xl border",
        isLight
          ? "border-primary-foreground/25 bg-primary-foreground/15"
          : "border-border/60 bg-card shadow-sm",
        className,
      )}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
    >
      <ArrowLeft
        size={20}
        color={isLight ? "white" : defaultIconColor}
      />
    </Pressable>
  );
}
