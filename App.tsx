import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { Platform, Text, TextInput, TextStyle } from 'react-native';
import InputScreen from './src/screens/InputScreen';
import TicketScreen from './src/screens/TicketScreen';

const Tab = createBottomTabNavigator();
const GREEN = '#006934';
const APP_FONT_FAMILY = Platform.select({
  ios: 'Hiragino Sans',
  android: 'sans-serif-medium',
  default: undefined,
});

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

function applyGlobalTypography(): void {
  if (!APP_FONT_FAMILY) return;

  function mergeTextStyle(
    currentStyle: TextStyle | TextStyle[] | undefined,
    nextStyle: TextStyle
  ): TextStyle[] {
    if (!currentStyle) return [nextStyle];
    return Array.isArray(currentStyle) ? [...currentStyle, nextStyle] : [currentStyle, nextStyle];
  }

  const textComponent = Text as typeof Text & {
    defaultProps?: {
      style?: TextStyle | TextStyle[];
    };
  };
  const textInputComponent = TextInput as typeof TextInput & {
    defaultProps?: {
      style?: TextStyle | TextStyle[];
    };
  };

  textComponent.defaultProps = {
    ...textComponent.defaultProps,
    style: mergeTextStyle(textComponent.defaultProps?.style, {
      fontFamily: APP_FONT_FAMILY,
      fontVariant: ['tabular-nums'],
    }),
  };

  textInputComponent.defaultProps = {
    ...textInputComponent.defaultProps,
    style: mergeTextStyle(textInputComponent.defaultProps?.style, { fontFamily: APP_FONT_FAMILY }),
  };
}

applyGlobalTypography();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons: Record<string, { active: TabIconName; inactive: TabIconName }> = {
              戦績: { active: 'calculator', inactive: 'calculator-outline' },
              馬券: { active: 'ticket', inactive: 'ticket-outline' },
            };
            const name = focused ? icons[route.name]?.active : icons[route.name]?.inactive;
            return <Ionicons name={name ?? 'ellipse-outline'} size={size} color={color} />;
          },
          tabBarActiveTintColor: GREEN,
          tabBarInactiveTintColor: '#AAA',
          headerStyle: { backgroundColor: GREEN },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: '700', ...(APP_FONT_FAMILY ? { fontFamily: APP_FONT_FAMILY } : {}) },
        })}
      >
        <Tab.Screen name="戦績" component={InputScreen} options={{ title: '戦績' }} />
        <Tab.Screen name="馬券" component={TicketScreen} options={{ title: '馬券リスト' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
