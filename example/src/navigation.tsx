import {
  createNavigationContainerRef,
  DefaultTheme,
  NavigationContainer,
  NavigationIndependentTree,
  type NavigationState,
  type ParamListBase,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo, useRef, type ReactElement } from 'react';
import { palette } from './demoTheme';

/**
 * One native stack per demo surface. The root screen is the surface's own
 * list or form, and every pushed screen renders through a callback so it keeps
 * reading the surface's state. Pushes, pops, and the swipe-back gesture use the
 * platform's native transitions (UINavigationController / Fragment).
 */
export type StackRef = ReturnType<
  typeof createNavigationContainerRef<ParamListBase>
>;

export function useScreenStack(): StackRef {
  const ref = useRef<StackRef>(null);
  if (!ref.current) ref.current = createNavigationContainerRef<ParamListBase>();
  return ref.current;
}

export function navigateTo(stack: StackRef, screen: string) {
  if (stack.isReady()) stack.navigate(screen as never);
}

export function goBack(stack: StackRef) {
  if (stack.isReady() && stack.canGoBack()) stack.goBack();
}

export function isOnScreen(stack: StackRef, screen: string): boolean {
  return stack.isReady() && stack.getCurrentRoute()?.name === screen;
}

const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: palette.paper,
    card: palette.paper,
  },
};

type Screen = ReactElement | null;

export function ScreenStack({
  onRouteChange,
  root,
  screens,
  stackRef,
}: {
  onRouteChange?: (routeName: string) => void;
  root: Screen;
  screens: Record<string, Screen>;
  stackRef: StackRef;
}) {
  const Stack = useMemo(() => createNativeStackNavigator(), []);
  // A surface may clear a pushed screen's state as soon as the pop starts.
  // Keep rendering the last element so the screen stays populated while the
  // native dismissal animates instead of flashing blank.
  const lastElements = useRef<Record<string, Screen>>({});
  for (const [name, element] of Object.entries(screens)) {
    if (element) lastElements.current[name] = element;
  }
  return (
    <NavigationIndependentTree>
      <NavigationContainer
        onStateChange={(state?: NavigationState) => {
          if (state) onRouteChange?.(state.routes[state.index]?.name ?? 'Root');
        }}
        ref={stackRef}
        theme={theme}
      >
        <Stack.Navigator
          screenOptions={{
            contentStyle: { backgroundColor: palette.paper },
            fullScreenGestureEnabled: true,
            gestureEnabled: true,
            headerShown: false,
          }}
        >
          <Stack.Screen name="Root">{() => root}</Stack.Screen>
          {Object.entries(screens).map(([name, element]) => (
            <Stack.Screen key={name} name={name}>
              {() => element ?? lastElements.current[name] ?? null}
            </Stack.Screen>
          ))}
        </Stack.Navigator>
      </NavigationContainer>
    </NavigationIndependentTree>
  );
}
