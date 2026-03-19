import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import InputScreen from './src/screens/InputScreen';
import HorsesScreen from './src/screens/HorsesScreen';
import TicketScreen from './src/screens/TicketScreen';

const Tab = createBottomTabNavigator();
const GREEN = '#006934';

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            const icons: Record<string, { active: string; inactive: string }> = {
              '入力': { active: 'calculator', inactive: 'calculator-outline' },
              '馬一覧': { active: 'list', inactive: 'list-outline' },
              '馬券': { active: 'ticket', inactive: 'ticket-outline' },
            };
            const name = (focused ? icons[route.name]?.active : icons[route.name]?.inactive) as any;
            return <Ionicons name={name} size={size} color={color} />;
          },
          tabBarActiveTintColor: GREEN,
          tabBarInactiveTintColor: '#AAA',
          headerStyle: { backgroundColor: GREEN },
          headerTintColor: '#FFF',
          headerTitleStyle: { fontWeight: '700' },
        })}
      >
        <Tab.Screen name="入力" component={InputScreen} options={{ title: '戦歴入力' }} />
        <Tab.Screen name="馬一覧" component={HorsesScreen} options={{ title: '保存した馬' }} />
        <Tab.Screen name="馬券" component={TicketScreen} options={{ title: '馬券リスト' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
