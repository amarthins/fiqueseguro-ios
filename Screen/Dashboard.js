import React, { useState, useRef, useContext, useEffect } from 'react'
import { View, Text, StatusBar, ScrollView, Modal, Dimensions, ImageBackground, Image, TouchableOpacity, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from '../src/styles'
import { MaterialCommunityIcons, Ionicons, FontAwesome, FontAwesomeIcon, FontAwesome5 } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient'
import { AuthContext } from '../src/contexts/auth'
import firebase from '../src/components/Firebase'
import { collection, addDoc } from "firebase/firestore"
import NetInfo from '@react-native-community/netinfo'
import moment from 'moment'
import { ActivityIndicator } from 'react-native-paper'
import * as Notifications from 'expo-notifications'

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
    }),
})


let { width, height } = Dimensions.get("window");

const Dashboard = ({ navigation, route }) => {

    const { signIn, getSituacao, salvaToken, _getMsgSqlById, _insereSql, retornaMsgSql, _getMensagensSys, _updateLido, updateLocations, _createSql, _verifyTable } = useContext(AuthContext)

    const [expoPushToken, setExpoPushToken] = useState('')
    const [notification, setNotification] = useState(false)
    const notificationListener = useRef()
    const responseListener = useRef()

    const [situacao, setSituacao] = useState(null)
    const [color1, setColor1] = useState('#FFF')
    const [color2, setColor2] = useState('#FFF')
    const [color3, setColor3] = useState('#FFF')
    const [btnColor, setBtnColor] = useState('#888')
    const [lista, setLista] = useState([])
    const [showModal, setShowModal] = useState(false)
    const [textoModal, setTextoModal] = useState(null)
    const [dataModal, setDataModal] = useState(null)
    const [horaModal, setHoraModal] = useState(null)
    const [refresh, setRefresh] = useState(false)
    const [isOnline, setIsOnline] = useState(false)
    const [loading, setLoading] = useState(true)
    const [iconSize, setIconSize] = useState(height < 600 ? 35 : 40)

    const observer = firebase.firestore().collection('barragens').onSnapshot(querySnapshot => {
        querySnapshot.docChanges().forEach(change => {
            const dados = change.doc.data()
            setSituacao(change.doc.data().status)
        })
    })

    NetInfo.configure({
        reachabilityUrl: 'https://clients3.google.com/generate_204',
        reachabilityTest: async (response) => response.status === 204,
        reachabilityLongTimeout: 30 * 1000,
        reachabilityShortTimeout: 5 * 1000,
        reachabilityRequestTimeout: 15 * 1000,
        reachabilityShouldRun: () => true,
        shouldFetchWiFiSSID: true,
        useNativeReachability: false
    })

    useEffect(() => {
        NetInfo.fetch().then(state => {
            if (isOnline !== state.isConnected) {
                setIsOnline(!!state.isConnected && !!state.isInternetReachable)
            }
        });
    }, [])
    NetInfo.addEventListener(state => {
        if (isOnline !== state.isConnected) {
            setIsOnline(!!state.isConnected && !!state.isInternetReachable)
        }
    })

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {
            if (isOnline) {
                const status = await getSituacao()
                await corOnline(status)
                setSituacao(status)
                await updateLocations()
            } else {
                await corOnline(null)
                setSituacao(null)
            }
            await signIn()
            height < 600 ? setIconSize(35) : setIconSize(40)
            await atualizaMensagens()
            setLoading(false)
        })
        return unsubscribe
    })

    useEffect(() => {
        (async () => {
            if (isOnline) {
                //await updateLocations()
                const situation = await getSituacao()
                await corOnline(situation)
                setSituacao(situation)
            } else {
                await corOnline(null)
            }
            await atualizaMensagens()
        })()
    }, [isOnline])

    useEffect(() => {
        (async () => {
            await corOnline(situacao)
            await atualizaMensagens()
            setShowModal(false)
        })()
    }, [situacao])

    useEffect(() => {
        (async () => {
            await corOnline(situacao)
            await atualizaMensagens()
            setShowModal(false)
            setLoading(false)
        })()
    }, [refresh])

    const corOnline = async (situation) => {
        if (isOnline) {
            if (situation === 'normal') {
                setColor1('#178C2C')
                setColor2('#00FF00')
                setColor3('#1eb53a')
                setBtnColor('#178C2C')
            } else if (situation === 'emergência') {
                setColor1('#CA0000')
                setColor2('#FF0000')
                setColor3('#FF2B2B')
                setBtnColor('#CA0000')
            } else if (situation === 'simulação') {
                setColor1('#3b5998')
                setColor2('#4661EB')
                setColor3('#4c669f')
                setBtnColor('#3b5998')
            }

        } else {
            setColor1('#FFF')
            setColor2('#FFF')
            setColor3('#FFF')
            setBtnColor('#888')
        }
        return true
    }

    const atualizaMensagens = async () => {
        const lastIdSql = await retornaMsgSql()
        if (isOnline) {
            let id = 0
            if (typeof lastIdSql[0] == 'undefined') {
                id = 0
            } else {
                id = lastIdSql[0].id_msg
            }
            const messages = await _getMensagensSys(id)
            if (messages.dados.length > 0) {
                for (let i = 0; i < messages.dados.length; i++) {
                    const valor = await _getMsgSqlById(messages.dados[i].id)
                    if (valor[0].contador == 0) {
                        let attr = {
                            id_msg: messages.dados[i].id,
                            titulo: messages.dados[i].titulo,
                            texto: messages.dados[i].texto,
                            short: messages.dados[i].short,
                            data: messages.dados[i].data,
                            lido: 'N'
                        }
                        await _insereSql(attr)
                    }
                }
            }
        }

        const msg = await retornaMsgSql()
        const tela = await montaMensagens(msg)

        return true
    }

    const montaMensagens = async (mensagens) => {
        let arr = []
        mensagens.map((vlr, inx) => {
            let icone = <View style={styles.wrapperIconOpen}>
                <Image
                    source={require('../src/assets/msg.png')}
                    style={styles.iconMsg}
                />
            </View>
            let textoShort = <Text style={[styles.texto14White, { marginLeft: 8 }]}>{vlr.short}</Text>
            if (vlr.lido === 'N') {
                icone = <View style={styles.wrapperIcon}>
                    <Image
                        source={require('../src/assets/msg.png')}
                        style={styles.iconMsg}
                    />
                </View>
                textoShort = <Text style={[styles.texto14WhiteBold, { marginLeft: 8 }]}>{vlr.short}</Text>
            }
            arr.push(
                <TouchableOpacity
                    key={inx + 100}
                    style={styles.linhaBtn}
                    onPress={() => handlePress(vlr)} >
                    <View style={styles.wrapperTouchIcone}>
                        {icone}
                    </View>
                    <View style={styles.wrapperTouchTexto}>
                        {textoShort}
                    </View>
                </TouchableOpacity>
            )
        })
        setLista(arr)

        return true
    }

    useEffect(() => {
        registerForPushNotificationsAsync().then(token => salvaToken(token, null));

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
                alert('Failed to get push token for push notification!');
                return;
            }
            token = (await Notifications.getExpoPushTokenAsync({
                projectId: 'd5f4af0c-3b15-4b0f-8386-cdae2bc7d565'
            })).data;
       

        return token;
    }


    const handlePress = async (item) => {
        setTextoModal(item.texto)
        setDataModal(moment(item.data).format('DD/MM/YYYY'))
        setHoraModal(moment(item.hora).format('HH:mm'))

        if (item.lido === 'N') {
            await _updateLido(item.id)
            setShowModal(true)
        } else if (item.lido === 'S') {
            setShowModal(true)
        }

    }

    const encerraModal = async () => {
        setShowModal(false)
        setRefresh(!refresh)
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
            <Modal
                visible={showModal}
                animationType="fade"
                onRequestClose={() => encerraModal()}
                transparent={true}>
                <View style={styles.modal}>
                    <View style={[styles.wrapperModal, { paddingBottom: 10 }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() => encerraModal()}>
                                <Text style={styles.btnCloseModal}>
                                    <MaterialCommunityIcons name="close-thick" size={30} color={btnColor} />
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <ScrollView>
                            <Text style={styles.textoContentModal}>{textoModal}</Text>
                        </ScrollView>
                        <View style={styles.modalFooter}>
                            <Text style={styles.textoData}>{dataModal}{'\n'}{horaModal}</Text>
                        </View>
                    </View>
                </View>
            </Modal>

            <LinearGradient style={styles.blocoLinear} colors={[color1, color2, color3]} >
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

                <View style={styles.blocoSituacao}>
                    <Text style={styles.textoNivel}>Nível de Segurança de Barragem</Text>
                    <Text style={styles.textoSituacao}>{situacao}</Text>
                </View>

                <View style={styles.blocoBottom}>
                    <View style={styles.blocoFull}>
                        <View style={styles.blocoMessages}>
                            <View style={styles.lineTitleMessage}>
                                <Text style={styles.textoTitleMessage}>Últimas Mensagens</Text>
                            </View>
                            <ScrollView>
                                {lista}
                            </ScrollView>
                        </View>

                    </View>
                </View>
                <View style={{ height: 0.05 * height }}></View>

                <View style={styles.blocoFooter}>
                    <View style={styles.wrapperFooter}>
                        <View style={styles.blocoTabs}>
                            <TouchableOpacity>
                                <FontAwesome name="home" size={iconSize} color={btnColor} />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('MapaScreen')}>
                                <FontAwesome5 name="map-marked-alt" size={iconSize} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('InfoScreen')}>
                                <FontAwesome name="info-circle" size={iconSize} color="#333" />
                            </TouchableOpacity>
                        </View>
                    </View>

                </View>
            </LinearGradient>
        </SafeAreaView>
    )
}
export default Dashboard
