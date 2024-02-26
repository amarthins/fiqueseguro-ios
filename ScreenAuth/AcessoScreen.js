import React, { useState, useRef, useEffect, useContext } from 'react'
import { View, StatusBar, Text, ActivityIndicator, ScrollView, Modal, Dimensions, ImageBackground, Image, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from '../src/styles'
import { MaterialCommunityIcons, Ionicons, FontAwesome, FontAwesomeIcon, FontAwesome5 } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient'
import { AuthContext } from '../src/contexts/auth'
import { WebView } from 'react-native-webview'
import * as Notifications from 'expo-notifications'
import Checkbox from 'expo-checkbox'

const AcessoScreen = ({ navigation }) => {

    const { signIn, rede, salvaToken, getInfoSys, _getInformacoesSql } = useContext(AuthContext)

    const [expoPushToken, setExpoPushToken] = useState('')
    const [notification, setNotification] = useState(false)
    const notificationListener = useRef()
    const responseListener = useRef()

    const [loading, setLoading] = useState(true)
    const [color1, setColor1] = useState('#178C2C')
    const [color2, setColor2] = useState('#00FF00')
    const [color3, setColor3] = useState('#1eb53a')
    const [btnColor, setBtnColor] = useState('#178C2C')
    const [isOnline, setIsOnline] = useState(rede)
    const [politica, setPolitica] = useState(' ')
    const [isChecked, setChecked] = useState(false)

    useEffect(() => {
        async function startPage() {
            let auth = await signIn()
            await getTexto()

            setLoading(false)
        }
        startPage()
    }, [])

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

        notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
            setNotification(notification);
        });

        responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('response', response);
        });

        return () => {
            Notifications.removeNotificationSubscription(notificationListener.current);
            Notifications.removeNotificationSubscription(responseListener.current);
        };
    }, [])

    async function registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            alert('Falha ao verificar a permissão para notificações!');
            return;
        }
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: 'd5f4af0c-3b15-4b0f-8386-cdae2bc7d565'
        })).data;

        return token;
    }

    const getTexto = async () => {
        if (isOnline) {
            const infoSys = await getInfoSys()
            await Promise.all(
                infoSys.dados.map(async (vlr) => {
                    if (vlr.tipo === 'privacidade') {
                        setPolitica(vlr.texto)
                    }
                })
            )
        }
        return true
    }

    const handlePress = async () => {
        if (expoPushToken !== undefined) {
            if (isChecked) {
                const salva = await salvaToken(expoPushToken, isChecked)
                if (salva) {
                    await signIn()
                }
            }
        } else {
            alert('Somente dispositivo físico pode ser usado.')
        }
    }

    if (loading) {
        return (
            <View style={styles.containerLoading}>
                <StatusBar backgroundColor={'#00CCCC'} />
                <ActivityIndicator size="large" color="white" />
            </View>
        )
    }

    return (
        <SafeAreaView style={{ backgroundColor: color1, flex: 1 }}>
            <StatusBar backgroundColor={btnColor} />

            <LinearGradient style={{ flex: 1 }} colors={[color1, color2, color3]} >
                {!isOnline && <View style={styles.linhaRede}>
                    <Text style={styles.textoRede}>Você não está conectado a internet!{'\n'}
                        As informações sobre a situação da Barragem Santo Antônio e os endereços dos pontos de
                        encontro não podem ser visualizados corretamente!</Text>
                </View>}
                <View style={styles.blocoHeader}>
                    <View style={styles.wrapperLogo}>
                        <Image
                            source={require('../src/assets/logo.png')}
                            style={styles.logoInicial}
                        />
                    </View>
                </View>

                <View style={styles.blocoAcesso}>
                    <View style={styles.wrapperAcesso}>
                        <WebView
                            textZoom={300}
                            minimumFontSize={22}
                            style={styles.infoView}
                            originWhitelist={['*']}
                            source={{ html: politica }}
                        />
                        <View style={styles.lineCheckbox}>
                            <Checkbox
                                style={styles.checkbox}
                                value={isChecked}
                                onValueChange={setChecked}
                                color={isChecked ? '#4630EB' : undefined}
                            />
                            <Text style={styles.textoData}>Aceito os termos e condições</Text>
                        </View>
                        <TouchableOpacity
                            style={styles.btnSave}
                            onPress={() => handlePress()}
                        >
                            <Text style={styles.texto14White}>ACEITAR</Text>
                        </TouchableOpacity>
                    </View>
                </View>

            </LinearGradient>
        </SafeAreaView >
    )
}
export default AcessoScreen