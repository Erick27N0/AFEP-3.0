import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, font, radius, spacing } from './theme';

type ToastKind = 'error' | 'success' | 'info';
type Toast = { id: number; message: string; kind: ToastKind };
type Ctx = { show: (message: string, kind?: ToastKind) => void };

const ToastCtx = createContext<Ctx>({ show: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hide = useCallback(() => {
    Animated.timing(opacity, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      setToast(null);
    });
  }, [opacity]);

  const show = useCallback(
    (message: string, kind: ToastKind = 'error') => {
      if (timer.current) clearTimeout(timer.current);
      setToast({ id: Date.now(), message, kind });
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
      timer.current = setTimeout(hide, 4500);
    },
    [opacity, hide]
  );

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const bg = toast?.kind === 'success' ? colors.success : toast?.kind === 'info' ? colors.info : colors.error;
  const icon: keyof typeof Feather.glyphMap =
    toast?.kind === 'success' ? 'check-circle' : toast?.kind === 'info' ? 'info' : 'alert-circle';

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View pointerEvents="box-none" style={[styles.wrap, { opacity }]}>
          <Pressable
            testID="toast"
            onPress={hide}
            style={[styles.toast, { backgroundColor: bg }]}
          >
            <Feather name={icon} size={18} color="#fff" />
            <Text style={styles.text} numberOfLines={3}>{toast.message}</Text>
            <Feather name="x" size={16} color="#fff" />
          </Pressable>
        </Animated.View>
      )}
    </ToastCtx.Provider>
  );
}

export const useToast = () => useContext(ToastCtx);

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 60,
    left: spacing.lg,
    right: spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    maxWidth: 500,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  text: { flex: 1, color: '#fff', fontSize: font.base, fontWeight: '500' },
});
