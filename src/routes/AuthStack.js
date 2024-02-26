import React, { useContext } from 'react'

import { Ionicons } from '@expo/vector-icons';
import { createNativeStackNavigator } from '@react-navigation/native-stack'

import AcessoScreen from '../../ScreenAuth/AcessoScreen';

const Stack = createNativeStackNavigator();

const AuthStack = () => {

    return (
        <Stack.Navigator>
            <Stack.Screen name="AcessoScreen" component={AcessoScreen} options={{ headerShown: false }} />
        </Stack.Navigator>
    )

}
export default AuthStack