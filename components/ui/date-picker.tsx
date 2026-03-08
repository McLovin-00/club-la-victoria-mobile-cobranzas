import { useState } from "react";
import { Pressable, Text, View, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";

interface DatePickerProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (date: string) => void; // Returns ISO format: YYYY-MM-DD
  placeholder?: string;
  displayFormat?: string; // Display format like "DD-MM-YYYY"
}

/**
 * Formats a date string from ISO (YYYY-MM-DD) to display format (DD-MM-YYYY)
 */
const formatDisplayDate = (isoDate: string): string => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
};

/**
 * Formats a Date object to ISO string (YYYY-MM-DD)
 */
const dateToIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Parses ISO string (YYYY-MM-DD) to Date object
 */
const isoToDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(year, month - 1, day);
};

export function DatePicker({
  value,
  onChange,
  placeholder = "Seleccionar fecha",
}: DatePickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date>(value ? isoToDate(value) : new Date());

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(dateToIso(selectedDate));
      }
    } else {
      // iOS - update temp date
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const handleIOSConfirm = () => {
    onChange(dateToIso(tempDate));
    setShowPicker(false);
  };

  const handleIOSCancel = () => {
    setTempDate(value ? isoToDate(value) : new Date());
    setShowPicker(false);
  };

  const openPicker = () => {
    setTempDate(value ? isoToDate(value) : new Date());
    setShowPicker(true);
  };

  return (
    <View>
      <Pressable
        onPress={openPicker}
        className="bg-background rounded-2xl px-3 py-2.5 flex-row items-center border border-border/40 active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={value ? `Fecha seleccionada: ${formatDisplayDate(value)}` : placeholder}
        accessibilityHint="Toca para seleccionar una fecha"
      >
        <Calendar size={16} color="hsl(var(--muted-foreground))" />
        <Text
          className={`flex-1 text-sm font-medium ml-2 ${value ? "text-foreground" : "text-muted-foreground"}`}
        >
          {value ? formatDisplayDate(value) : placeholder}
        </Text>
      </Pressable>

      {showPicker && Platform.OS === "android" && (
        <DateTimePicker
          value={tempDate}
          mode="date"
          display="default"
          onChange={handleChange}
        />
      )}

      {showPicker && Platform.OS === "ios" && (
        <View className="absolute top-full left-0 right-0 bg-card rounded-2xl border border-border/40 shadow-elevated mt-1 z-50">
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            onChange={handleChange}
            textColor="hsl(var(--foreground))"
            style={{ height: 200 }}
          />
          <View className="flex-row border-t border-border/40">
            <Pressable
              onPress={handleIOSCancel}
              className="flex-1 py-3 items-center border-r border-border/40 active:bg-muted/20"
            >
              <Text className="text-muted-foreground font-medium">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleIOSConfirm}
              className="flex-1 py-3 items-center active:bg-primary/20"
            >
              <Text className="text-primary font-semibold">Confirmar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
