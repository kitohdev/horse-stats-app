import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import InputScreen from './src/screens/InputScreen';
import TicketScreen from './src/screens/TicketScreen';

const Tab = createBottomTabNavigator();
const GREEN = '#006934';

type TabIconName = React.ComponentProps<typeof Ionicons>['name'];

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons: Record<string, { active: TabIconName; inactive: TabIconName }> = {
              戦歴: { active: 'calculator', inactive: 'calculator-outline' },
              馬券: { active: 'ticket', inactive: 'ticket-outline' },
            };
            const name = focused ? icons[route.name]?.active : icons[route.name]?.inactive;
            return <Ionicons name={name ?? 'ellipse-outline'} size={size} color={color} />;
          },
          tabBarActiveTintColor: GREEN,
          tabBarInactiveTintColor: '#AAA',
          headerStyle: { backgroundColor: GREEN },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: '700' },
        })}
      >
        <Tab.Screen name="戦歴" component={InputScreen} options={{ title: '戦歴' }} />
        <Tab.Screen name="馬券" component={TicketScreen} options={{ title: '馬券リスト' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
