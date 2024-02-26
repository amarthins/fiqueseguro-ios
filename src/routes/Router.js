import React, { useContext } from 'react'
import AppStack from '../routes/AppStack'
import AuthStack from './AuthStack'
import { AuthContext } from '../contexts/auth'

const Router = () => {

    const { token,authorization } = useContext(AuthContext)

    if (token !== undefined && token !== false && authorization) {

        return <AppStack />

    } else {

        return <AuthStack />

    }

}

export default Router