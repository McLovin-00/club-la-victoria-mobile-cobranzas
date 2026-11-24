import { createElement, useState } from "react";
import { Pressable, Text, View, Platform } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Calendar } from "lucide-react-native";

interface DatePickerProps {
  value: string; // ISO format: YYYY-MM-DD
  onChange: (date: string) => void; // Returns ISO format: YYYY-MM-DD
  placeholder?: string;
  displayFormat?: string;
}

const formatDisplayDate = (isoDate: string): string => {
  if (!isoDate) return "";
  const [year, month, day] = isoDate.split("-");
  return `${day}-${month}-${year}`;
};

const dateToIso = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

  if (Platform.OS === "web") {
    return (
      <View className="w-full">
        {createElement("input", {
          type: "date",
          value: value || "",
          "aria-label": value ? `Fecha seleccionada: ${formatDisplayDate(value)}` : placeholder,
          onChange: (event: { target: { value?: string } }) => {
            const nextValue = event.target?.value;
            if (nextValue && /^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
              onChange(nextValue);
            }
          },
          style: {
            width: "100%",
            minHeight: 44,
            paddingLeft: 12,
            paddingRight: 12,
            paddingTop: 8,
            paddingBottom: 8,
            borderRadius: 14,
            border: "1px solid hsl(145, 12%, 82%)",
            backgroundColor: "hsl(145, 12%, 98%)",
            color: "hsl(150, 15%, 11%)",
            fontSize: 14,
            fontWeight: 500,
            fontVariantNumeric: "tabular-nums",
            boxSizing: "border-box",
          },
        })}
      </View>
    );
  }

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
      if (event.type === "set" && selectedDate) {
        onChange(dateToIso(selectedDate));
      }
    } else if (selectedDate) {
      setTempDate(selectedDate);
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
        className="min-h-11 bg-background rounded-2xl px-3 py-2.5 flex-row items-center border border-border active:opacity-70"
        accessibilityRole="button"
        accessibilityLabel={value ? `Fecha seleccionada: ${formatDisplayDate(value)}` : placeholder}
        accessibilityHint="Toca para seleccionar una fecha"
      >
        <Calendar size={16} color="hsl(150, 8%, 37%)" />
        <Text
          className={`flex-1 text-sm font-medium ml-2 ${value ? "text-foreground" : "text-muted-foreground"}`}
          style={{ fontVariant: ["tabular-nums"] }}
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
        <View className="bg-card rounded-2xl border border-border shadow-elevated mt-2 overflow-hidden">
          <DateTimePicker
            value={tempDate}
            mode="date"
            display="spinner"
            onChange={handleChange}
            textColor="hsl(150, 15%, 11%)"
            style={{ height: 180 }}
          />
          <View className="flex-row border-t border-border">
            <Pressable
              onPress={handleIOSCancel}
              className="flex-1 py-3 items-center border-r border-border active:bg-muted/40"
            >
              <Text className="text-muted-foreground font-medium">Cancelar</Text>
            </Pressable>
            <Pressable
              onPress={handleIOSConfirm}
              className="flex-1 py-3 items-center active:bg-primary/15"
            >
              <Text className="text-primary font-semibold">Confirmar</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
