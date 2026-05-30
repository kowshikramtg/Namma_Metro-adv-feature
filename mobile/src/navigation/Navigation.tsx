/**
 * App Navigation — React Navigation stack configuration.
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../shared/types';

import HomeScreen from '../features/home/HomeScreen';
import QRPurchaseScreen from '../features/tickets/QRPurchaseScreen';
import TicketDetailsScreen from '../features/tickets/TicketDetailsScreen';
import JourneyTimelineScreen from '../features/journey/JourneyTimelineScreen';
import JourneyVisualizationScreen from '../features/journey/JourneyVisualizationScreen';
import RoutePlannerScreen from '../features/route-planner/RoutePlannerScreen';
import MetroMapScreen from '../features/metro-map/MetroMapScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function Navigation() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F5F5F5' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="QRTickets" component={QRPurchaseScreen} />
        <Stack.Screen name="TicketDetails" component={TicketDetailsScreen} />
        <Stack.Screen name="JourneyTimeline" component={JourneyTimelineScreen} />
        <Stack.Screen name="JourneyVisualization" component={JourneyVisualizationScreen} />
        <Stack.Screen name="RoutePlanner" component={RoutePlannerScreen} />
        <Stack.Screen name="MetroMap" component={MetroMapScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
