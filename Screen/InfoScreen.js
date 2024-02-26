import React, { useState, useEffect, useContext } from 'react'
import { View, StatusBar, Text, ActivityIndicator, ScrollView, Modal, Dimensions, ImageBackground, Image, TouchableOpacity } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import styles from '../src/styles'
import { MaterialCommunityIcons, Ionicons, FontAwesome, FontAwesomeIcon, FontAwesome5 } from "@expo/vector-icons"
import { LinearGradient } from 'expo-linear-gradient'
import { AuthContext } from '../src/contexts/auth'
import firebase from '../src/components/Firebase'
import { WebView } from 'react-native-webview'
import NetInfo from '@react-native-community/netinfo'

let { width, height } = Dimensions.get("window");

const InfoScreen = ({ navigation, route }) => {

    const { getSituacao, _getInformacoesSql, getInfoSys, _insereInfoSql } = useContext(AuthContext)

    const [loading, setLoading] = useState(true)
    const [situacao, setSituacao] = useState(null)
    const [color1, setColor1] = useState('#FFF')
    const [color2, setColor2] = useState('#FFF')
    const [color3, setColor3] = useState('#FFF')
    const [btnColor, setBtnColor] = useState('#888')
    const [showModal, setShowModal] = useState(false)
    const [textoModal, setTextoModal] = useState(null)
    const [doubts, setDoubts] = useState(null)
    const [privacy, setPrivacy] = useState(null)
    const [about, setAbout] = useState(null)
    const [size, setSize] = useState('35%')
    const [isOnline, setIsOnline] = useState(true)
    const [iconSize, setIconSize] = useState(height < 600 ? 35 : 40)
    const [iconInfoSize, setIconInfoSize] = useState(height < 600 ? 25 : 30)

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
                //setIsOnline(false)
            }
        });
    }, [])
    NetInfo.addEventListener(state => {
        if (isOnline !== state.isConnected) {
            setIsOnline(!!state.isConnected && !!state.isInternetReachable)
            //setIsOnline(false)
        }
    })

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', async () => {
            if (isOnline) {
                const status = await getSituacao()
                await corOnline(status)
                setSituacao(status)
            }
            height < 600 ? setIconSize(35) : setIconSize(40)
            await montaTela()
        })
        return unsubscribe
    })

    useEffect(() => {
        (async () => {
            if (isOnline) {
                const situation = await getSituacao()
                await corOnline(situation)
                setSituacao(situation)
            } else {
                await corOnline(null)
            }
            await montaTela()
        })()
    }, [isOnline])

    useEffect(() => {
        (async () => {
            if (isOnline) {
                const situation = await getSituacao()
                await corOnline(situacao)
            } else {
                await corOnline(null)
            }
            await montaTela()
            setShowModal(false)
        })()
    }, [situacao])

    const montaTela = async () => {
        const infoSql = await _getInformacoesSql()
        let valores = infoSql

        if (isOnline) {
            const infoSys = await getInfoSys()
            if (typeof infoSql[0] == 'undefined') {
                await Promise.all(
                    infoSys.dados.map(async (vlr) => {
                        let dados = {
                            titulo: vlr.titulo,
                            tipo: vlr.tipo,
                            texto: vlr.texto,
                            short: vlr.short,
                            timestamp: vlr.timestamp,
                            size: vlr.size
                        }
                        await _insereInfoSql(dados)
                    })
                )
                valores = infoSys.dados

            } else {
                valores = infoSql
            }

        } else {
            valores = infoSql
        }

        valores.map((vlr, index) => {
            if (vlr.tipo === 'duvidas') {
                setDoubts({ texto: vlr.texto, size: vlr.size })
            } else if (vlr.tipo == 'privacidade') {
                setPrivacy({ texto: vlr.texto, size: vlr.size })
            } else if (vlr.tipo == 'about') {
                setAbout({ texto: vlr.texto, size: vlr.size })
            }
        })
        setLoading(false)
    }

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

    const handleModal = async (opcao) => {
        if (opcao === 'doubts') {
            setSize(doubts.size)
            setTextoModal(doubts.texto)
        } else if (opcao === 'private') {
            setSize(privacy.size)
            setTextoModal(privacy.texto)
        } else if (opcao === 'about') {
            setSize(about.size)
            setTextoModal(about.texto)
        }
        setShowModal(true)
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
                animationType='slide'
                transparent={true}
                visible={showModal}
                onRequestClose={() => setShowModal(false)}>
                <View style={styles.modal}>
                    <View style={[styles.wrapperModal, { minHeight: size }]}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                onPress={() => setShowModal(false)}>
                                <Text style={styles.btnCloseModal}>
                                    <MaterialCommunityIcons name="close-thick" size={30} color={btnColor} />
                                </Text>
                            </TouchableOpacity>
                        </View>
                        <WebView
                            textZoom={300}
                            minimumFontSize={22}
                            style={styles.infoView}
                            originWhitelist={['*']}
                            source={{ html: textoModal }}
                        />
                    </View>
                </View>
            </Modal>

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

                <View style={styles.blocoInfo}>
                    <View style={styles.wrapperInfo}>
                        <View style={styles.wrapperBtn}>
                            <TouchableOpacity
                                onPress={() => handleModal('doubts')}
                                style={[styles.btnInfo, { borderColor: btnColor }]}>
                                <View style={styles.linhaIcone}>
                                    <FontAwesome name="question-circle" size={iconInfoSize} color={btnColor} />
                                </View>
                                <Text style={styles.textoContentModal}>Dúvidas Frequentes</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.wrapperBtn}>
                            <TouchableOpacity
                                onPress={() => handleModal('private')}
                                style={[styles.btnInfo, { borderColor: btnColor }]}>
                                <View style={styles.linhaIcone}>
                                    <Ionicons name="document-text" size={iconInfoSize} color={btnColor} />
                                </View>
                                <Text style={styles.textoContentModal}>Política de Privacidade</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.wrapperBtn}>
                            <TouchableOpacity
                                onPress={() => handleModal('about')}
                                style={[styles.btnInfo, { borderColor: btnColor }]}>
                                <View style={styles.linhaIcone}>
                                    <FontAwesome5 name="info" size={iconInfoSize} color={btnColor} />
                                </View>
                                <Text style={styles.textoContentModal}>Sobre o Aplicativo</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.lineVersion}>
                    <Text style={styles.texto14White}>Versão 1.3</Text>
                </View>

                <View style={styles.blocoFooter}>
                    <View style={styles.wrapperFooter}>
                        <View style={styles.blocoTabs}>
                            <TouchableOpacity onPress={() => navigation.navigate('Dashboard')}>
                                <FontAwesome name="home" size={iconSize} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => navigation.navigate('MapaScreen')}>
                                <FontAwesome5 name="map-marked-alt" size={iconSize} color="#333" />
                            </TouchableOpacity>
                            <TouchableOpacity>
                                <FontAwesome name="info-circle" size={iconSize} color={btnColor} />
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

            </LinearGradient>
        </SafeAreaView >
    )
}
export default InfoScreen