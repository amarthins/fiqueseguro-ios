import React, { useContext } from 'react'

import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import Dashboard from '../../Screen/Dashboard'
import MapaScreen from '../../Screen/MapaScreen'
import InfoScreen from '../../Screen/InfoScreen'

const Stack = createNativeStackNavigator();

const AppStack = () => {

    return (
        <Stack.Navigator>
            <Stack.Screen name="Dashboard" component={Dashboard} options={{ headerShown: false }} />
            <Stack.Screen name="MapaScreen" component={MapaScreen} options={{ headerShown: false }} />
            <Stack.Screen name="InfoScreen" component={InfoScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    )

}
export default AppStack