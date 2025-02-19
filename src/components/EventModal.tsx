import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, addWeeks, addMonths, isAfter, parseISO } from 'date-fns';
import { db } from '../services/firebase';
import type { User, Event, Plan, EventType, MusicStyle } from '../types';

// Se usar expo-datetime-picker ou @react-native-community/datetimepicker:
import DateTimePicker from '@react-native-community/datetimepicker';

/**
 * SUB-MODAL DE SELEÇÃO GENÉRICO
 * Para exibir lista de opções (tipo de evento ou estilos musicais).
 */
function SubModalSelector({
  visible,
  title,
  items,
  multiple,
  selectedItems,
  maxCount,
  onClose,
  onSelect,
}: {
  visible: boolean;
  title: string;
  items: { id: string; name: string }[];
  multiple?: boolean;
  selectedItems: string[];
  maxCount?: number;
  onClose: () => void;
  onSelect: (newSelected: string[]) => void;
}) {
  const [tempSelected, setTempSelected] = useState<string[]>([]);

  useEffect(() => {
    setTempSelected([...selectedItems]);
  }, [selectedItems, visible]);

  function handleItemPress(id: string) {
    const alreadySelected = tempSelected.includes(id);
    if (!multiple) {
      // Seleção única
      setTempSelected(alreadySelected ? [] : [id]);
    } else {
      if (alreadySelected) {
        setTempSelected(tempSelected.filter((x) => x !== id));
      } else {
        // Se houver limite maxCount
        if (maxCount && tempSelected.length >= maxCount) {
          Alert.alert(`Limite de ${maxCount} itens atingido`);
          return;
        }
        setTempSelected([...tempSelected, id]);
      }
    }
  }

  function handleConfirm() {
    onSelect(tempSelected);
    onClose();
  }

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={stylesSub.overlay}>
        <View style={stylesSub.container}>
          <Text style={stylesSub.title}>{title}</Text>
          <ScrollView style={{ maxHeight: '80%' }}>
            {items.map((itm) => {
              const selected = tempSelected.includes(itm.id);
              return (
                <TouchableOpacity
                  key={itm.id}
                  style={[stylesSub.itemRow, selected && stylesSub.itemRowSelected]}
                  onPress={() => handleItemPress(itm.id)}
                >
                  <Text
                    style={[
                      stylesSub.itemText,
                      selected && { color: '#007AFF', fontWeight: 'bold' },
                    ]}
                  >
                    {itm.name}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" style={{ marginLeft: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={stylesSub.buttonRow}>
            <TouchableOpacity style={stylesSub.cancelBtn} onPress={onClose}>
              <Text style={stylesSub.btnText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={stylesSub.confirmBtn} onPress={handleConfirm}>
              <Text style={stylesSub.btnText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface EventModalProps {
  visible: boolean;
  onClose: () => void;
  user: User;
  plan: Plan;
  editingEvent?: Event;
  defaultDate?: string; // data do dia selecionado no calendário
  refreshData: () => void;
}

export function EventModal({
  visible,
  onClose,
  user,
  plan,
  editingEvent,
  defaultDate,
  refreshData,
}: EventModalProps) {
  const isPaidPlan = plan.price > 0;

  // --------------------------------------------
  // STATES
  // --------------------------------------------
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [startTime, setStartTime] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 1));
  const [endTime, setEndTime] = useState<Date>(addDays(new Date(), 1));
  const [location, setLocation] = useState('');
  const [selectedType, setSelectedType] = useState<string>(''); // ID do EventType
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [minCache, setMinCache] = useState(0);
  const [maxCache, setMaxCache] = useState(0);
  const [autoPromote, setAutoPromote] = useState(false);

  // Recorrência
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceFrequency, setRecurrenceFrequency] = useState<'daily' | 'weekly' | 'monthly'>(
    'daily'
  );
  const [recurrenceEndDate, setRecurrenceEndDate] = useState<Date>(addWeeks(new Date(), 4));

  // Se edita série
  const [applyToSeries, setApplyToSeries] = useState(false);

  // Sub-modais
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [stylesModalVisible, setStylesModalVisible] = useState(false);

  // Listas do BD
  const [eventTypes, setEventTypes] = useState<EventType[]>([]);
  const [musicStyles, setMusicStyles] = useState<MusicStyle[]>([]);

  const isEditMode = !!editingEvent;

  // Carregamento inicial
  useEffect(() => {
    if (visible) {
      loadEventTypesAndStyles();
      initForm();
    }
  }, [visible]);

  // Carregar do Firestore (ou filtrar) apenas o que for necessário
  async function loadEventTypesAndStyles() {
    // Exemplo: se plano grátis, filtrar para exibir apenas "SHOW"
    // senão, exibir todos
    const allEventTypes: EventType[] = [
      // Se preferir, busque do Firestore
      // ...
      { id: 'SHOW', name: 'Show ao Vivo' },
      { id: 'FESTIVAL', name: 'Festival' },
      // ... etc
    ];
    let filteredTypes = allEventTypes;
    if (!isPaidPlan) {
      filteredTypes = allEventTypes.filter((t) => t.id === 'SHOW');
    }
    setEventTypes(filteredTypes);

    // Carregar "musicStyles" (poderia vir do Firestore):
    const allMusicStyles: MusicStyle[] = [
      { id: 'rock', name: 'Rock' },
      { id: 'pop', name: 'Pop' },
      { id: 'mpb', name: 'MPB' },
      { id: 'jazz', name: 'Jazz' },
      { id: 'funk', name: 'Funk' },
    ];
    setMusicStyles(allMusicStyles);
  }

  function initForm() {
    if (!editingEvent) {
      // Criação
      setTitle('');
      // Se defaultDate existe, usamos no startDate
      const baseStart = defaultDate ? parseISO(defaultDate) : new Date();
      setStartDate(baseStart);
      setStartTime(baseStart); // assumimos a hora atual ou 00:00
      const baseEnd = addDays(baseStart, 1);
      setEndDate(baseEnd);
      setEndTime(baseEnd);
      // Local: se free => desabilitado c/ user.mainAddress
      setLocation(!isPaidPlan ? user.mainAddress || '' : '');
      setSelectedType('');
      setSelectedStyles([]);
      setMinCache(0);
      setMaxCache(0);
      setAutoPromote(false);
      setIsRecurring(false);
      setRecurrenceFrequency('daily');
      setRecurrenceEndDate(addWeeks(new Date(), 4));
      setApplyToSeries(false);
    } else {
      // Edição
      setTitle(editingEvent.title);
      const sDate = new Date(editingEvent.startDate);
      setStartDate(sDate);
      setStartTime(sDate);
      const eDate = new Date(editingEvent.endDate);
      setEndDate(eDate);
      setEndTime(eDate);
      setLocation(editingEvent.location);
      setSelectedType(editingEvent.eventType || '');
      setSelectedStyles(editingEvent.styles || []);
      setMinCache(editingEvent.minCache || 0);
      setMaxCache(editingEvent.maxCache || 0);
      setAutoPromote(isPaidPlan ? !!editingEvent.autoPromote : false);

      setIsRecurring(!!editingEvent.seriesId);
      setApplyToSeries(false);
      setRecurrenceFrequency('daily');
      setRecurrenceEndDate(addWeeks(sDate, 4));
    }
  }

  // Render date/time pickers
  function renderDateTimePickers(
    mode: 'start' | 'end'
  ): JSX.Element {
    // No web: exibimos <input type="date"/>, <input type="time"/>
    // No mobile: exibimos <DateTimePicker />
    if (Platform.OS === 'web') {
      const dateVal = mode === 'start' ? startDate : endDate;
      const timeVal = mode === 'start' ? startTime : endTime;

      return (
        <View style={styles.dateTimeWeb}>
          <View style={styles.iconRow}>
            <Ionicons name="calendar-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.label}>Data ({mode === 'start' ? 'Início' : 'Fim'})</Text>
          </View>
          <TextInput
            style={styles.input}
            type="date"
            value={format(dateVal, 'yyyy-MM-dd')}
            onChangeText={(val) => {
              // parse val (yyyy-MM-dd)
              const [yyyy, mm, dd] = val.split('-');
              const newDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
              if (mode === 'start') {
                setStartDate(newDate);
              } else {
                setEndDate(newDate);
              }
            }}
          />

          <View style={[styles.iconRow, { marginTop: 10 }]}>
            <Ionicons name="time-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
            <Text style={styles.label}>Hora ({mode === 'start' ? 'Início' : 'Fim'})</Text>
          </View>
          <TextInput
            style={styles.input}
            type="time"
            value={format(timeVal, 'HH:mm')}
            onChangeText={(val) => {
              const [hh, min] = val.split(':');
              const newTime = new Date(dateVal);
              newTime.setHours(Number(hh));
              newTime.setMinutes(Number(min));
              if (mode === 'start') {
                setStartTime(newTime);
              } else {
                setEndTime(newTime);
              }
            }}
          />
        </View>
      );
    }

    // Em mobile (iOS/Android)
    const dateVal = mode === 'start' ? startDate : endDate;
    const timeVal = mode === 'start' ? startTime : endTime;

    return (
      <View style={{ marginTop: 12 }}>
        <View style={styles.iconRow}>
          <Ionicons
            name={mode === 'start' ? 'calendar-outline' : 'calendar'}
            size={20}
            color="#007AFF"
            style={{ marginRight: 6 }}
          />
          <Text style={styles.label}>
            Data e Hora ({mode === 'start' ? 'Início' : 'Fim'})
          </Text>
        </View>
        <DateTimePicker
          value={dateVal}
          mode="date"
          onChange={(e, d) => {
            if (d) {
              if (mode === 'start') setStartDate(d);
              else setEndDate(d);
            }
          }}
        />
        <DateTimePicker
          value={timeVal}
          mode="time"
          onChange={(e, d) => {
            if (d) {
              if (mode === 'start') setStartTime(d);
              else setEndTime(d);
            }
          }}
        />
      </View>
    );
  }

  function handleValidate(): boolean {
    if (!title.trim()) {
      Alert.alert('Erro', 'Título é obrigatório');
      return false;
    }
    // Montar datas "completas" (união de date e time)
    const sDateTime = new Date(startDate);
    sDateTime.setHours(startTime.getHours());
    sDateTime.setMinutes(startTime.getMinutes());

    const eDateTime = new Date(endDate);
    eDateTime.setHours(endTime.getHours());
    eDateTime.setMinutes(endTime.getMinutes());

    if (sDateTime >= eDateTime) {
      Alert.alert('Erro', 'Data final deve ser após a data inicial');
      return false;
    }

    if (!selectedType) {
      Alert.alert('Erro', 'Selecione um tipo de evento');
      return false;
    }

    if (selectedStyles.length === 0) {
      Alert.alert('Erro', 'Selecione ao menos 1 estilo musical');
      return false;
    }
    if (!isPaidPlan && selectedStyles.length > 3) {
      Alert.alert('Erro', 'No plano grátis, máximo 3 estilos');
      return false;
    }

    if (minCache > maxCache) {
      Alert.alert('Erro', 'Cachê mínimo não pode exceder o máximo');
      return false;
    }
    return true;
  }

  function handleSave() {
    if (!handleValidate()) return;
    // Exemplo: a parte de gravar no Firestore e recorrência etc.
    // ...
    Alert.alert('Sucesso', 'Evento salvo (simulação).');
    refreshData();
    onClose();
  }

  // -------------------------------------
  // RENDER
  // -------------------------------------
  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.content}>
            {/* Cabeçalho */}
            <View style={styles.headerRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="create-outline" size={24} color="#007AFF" style={{ marginRight: 8 }} />
                <Text style={styles.headerTitle}>
                  {isEditMode ? 'Editar Evento' : 'Novo Evento'}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {/* Título */}
            <View style={styles.iconRow}>
              <Ionicons name="bookmark-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Título do Evento</Text>
            </View>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} />

            {/* Data e Hora de Início/Fim */}
            {renderDateTimePickers('start')}
            {renderDateTimePickers('end')}

            {/* Local */}
            <View style={[styles.iconRow, { marginTop: 16 }]}>
              <Ionicons name="location-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Local do Evento</Text>
            </View>
            {isPaidPlan ? (
              <TextInput style={styles.input} value={location} onChangeText={setLocation} />
            ) : (
              <TextInput
                style={[styles.input, { backgroundColor: '#f0f0f0' }]}
                value={location}
                onChangeText={setLocation}
                editable={false}
              />
            )}

            {/* Tipo de Evento */}
            <View style={[styles.iconRow, { marginTop: 16 }]}>
              <Ionicons name="document-text-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Tipo de Evento</Text>
            </View>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setTypeModalVisible(true)}
            >
              <Text style={{ flex: 1, color: selectedType ? '#000' : '#999' }}>
                {selectedType
                  ? eventTypes.find((et) => et.id === selectedType)?.name
                  : 'Selecionar...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {/* Estilos Musicais */}
            <View style={[styles.iconRow, { marginTop: 16 }]}>
              <Ionicons name="musical-notes-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Estilos Musicais</Text>
            </View>
            <TouchableOpacity
              style={[styles.input, { flexDirection: 'row', alignItems: 'center' }]}
              onPress={() => setStylesModalVisible(true)}
            >
              <Text style={{ flex: 1, color: selectedStyles.length > 0 ? '#000' : '#999' }}>
                {selectedStyles.length > 0
                  ? `Selecionados: ${selectedStyles.length}`
                  : 'Selecionar...'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            {/* Cachê Mín / Máx */}
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <View style={{ flex: 1 }}>
                <View style={styles.iconRow}>
                  <Ionicons name="cash-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
                  <Text style={styles.label}>Cachê Mínimo</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(minCache)}
                  onChangeText={(v) => setMinCache(Number(v) || 0)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.iconRow}>
                  <Ionicons name="cash-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
                  <Text style={styles.label}>Cachê Máximo</Text>
                </View>
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(maxCache)}
                  onChangeText={(v) => setMaxCache(Number(v) || 0)}
                />
              </View>
            </View>

            {/* Checkbox Auto-Promote */}
            <View style={[styles.iconRow, { marginTop: 16 }]}>
              <Ionicons name="megaphone-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Auto-Divulgação</Text>
            </View>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, autoPromote && isPaidPlan && { backgroundColor: '#007AFF' }]}
                onPress={() => {
                  if (!isPaidPlan) {
                    Alert.alert(
                      'Função exclusiva de plano pago',
                      'Você precisa de um plano pago para ativar Auto-Divulgação'
                    );
                    return;
                  }
                  setAutoPromote(!autoPromote);
                }}
              >
                {autoPromote && isPaidPlan && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={{ marginLeft: 8 }}>Ativar Auto-Divulgação (plano pago)</Text>
            </View>

            {/* Recorrência */}
            <View style={[styles.iconRow, { marginTop: 16 }]}>
              <Ionicons name="repeat-outline" size={20} color="#007AFF" style={{ marginRight: 6 }} />
              <Text style={styles.label}>Evento Recorrente?</Text>
            </View>
            <View style={styles.checkboxRow}>
              <TouchableOpacity
                style={[styles.checkbox, isRecurring && { backgroundColor: '#007AFF' }]}
                onPress={() => setIsRecurring(!isRecurring)}
              >
                {isRecurring && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </TouchableOpacity>
              <Text style={{ marginLeft: 8 }}>Ativar recorrência</Text>
            </View>

            {isRecurring && (
              <View style={styles.recurringContainer}>
                <View style={[styles.iconRow, { marginTop: 4 }]}>
                  <Ionicons name="repeat" size={18} color="#007AFF" style={{ marginRight: 4 }} />
                  <Text style={styles.label}>Frequência</Text>
                </View>
                <View style={styles.freqRow}>
                  {(['daily','weekly','monthly'] as const).map((freq) => {
                    const selected = recurrenceFrequency === freq;
                    return (
                      <TouchableOpacity
                        key={freq}
                        style={[styles.freqItem, selected && { backgroundColor: '#E3F2FD' }]}
                        onPress={() => setRecurrenceFrequency(freq)}
                      >
                        <Text style={{ color: selected ? '#007AFF' : '#333' }}>
                          {freq === 'daily' ? 'Diário' : freq === 'weekly' ? 'Semanal' : 'Mensal'}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.iconRow, { marginTop: 8 }]}>
                  <Ionicons name="calendar-outline" size={18} color="#007AFF" style={{ marginRight: 4 }} />
                  <Text style={styles.label}>Data Limite da Recorrência</Text>
                </View>
                {Platform.OS === 'web' ? (
                  <TextInput
                    style={styles.input}
                    type="date"
                    value={format(recurrenceEndDate, 'yyyy-MM-dd')}
                    onChangeText={(val) => {
                      const [yyyy, mm, dd] = val.split('-');
                      setRecurrenceEndDate(new Date(Number(yyyy), Number(mm) - 1, Number(dd)));
                    }}
                  />
                ) : (
                  <DateTimePicker
                    value={recurrenceEndDate}
                    mode="date"
                    onChange={(e, d) => {
                      if (d) setRecurrenceEndDate(d);
                    }}
                  />
                )}
              </View>
            )}

            {isEditMode && editingEvent?.seriesId && (
              <View style={[styles.checkboxRow, { marginTop: 12 }]}>
                <TouchableOpacity
                  style={[styles.checkbox, applyToSeries && { backgroundColor: '#007AFF' }]}
                  onPress={() => setApplyToSeries(!applyToSeries)}
                >
                  {applyToSeries && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </TouchableOpacity>
                <Text style={{ marginLeft: 8 }}>Aplicar a toda a série de eventos</Text>
              </View>
            )}

            {/* Botões de Ação */}
            <View style={styles.actionButtons}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelButtonText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                <Text style={styles.saveButtonText}>
                  {isEditMode ? 'Salvar Alterações' : 'Criar Evento'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Sub-Modal: escolher TIPO DE EVENTO */}
      <SubModalSelector
        visible={typeModalVisible}
        title="Selecione o Tipo de Evento"
        items={eventTypes.map((et) => ({ id: et.id, name: et.name }))}
        multiple={false}
        selectedItems={selectedType ? [selectedType] : []}
        onClose={() => setTypeModalVisible(false)}
        onSelect={(arr) => {
          setSelectedType(arr[0] || '');
        }}
      />

      {/* Sub-Modal: escolher ESTILOS MUSICAIS */}
      <SubModalSelector
        visible={stylesModalVisible}
        title="Escolha os Estilos Musicais"
        items={musicStyles.map((ms) => ({ id: ms.id, name: ms.name }))}
        multiple
        maxCount={isPaidPlan ? undefined : 3} // free => 3
        selectedItems={selectedStyles}
        onClose={() => setStylesModalVisible(false)}
        onSelect={(arr) => setSelectedStyles(arr)}
      />
    </Modal>
  );
}

// --------------------------------------
// ESTILOS
// --------------------------------------
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '95%',
    maxWidth: 500,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  content: {
    paddingBottom: 24,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    fontSize: 14,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#ccc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  recurringContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 6,
  },
  freqRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 6,
  },
  freqItem: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 18,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#eee',
    borderRadius: 6,
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#007AFF',
    borderRadius: 6,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  dateTimeWeb: {
    marginTop: 12,
  },
});

// Estilos para o submodal de seleção
const stylesSub = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  itemRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  itemRowSelected: {
    backgroundColor: '#F0F7FF',
  },
  itemText: {
    fontSize: 14,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 16,
    gap: 12,
  },
  cancelBtn: {
    backgroundColor: '#eee',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  confirmBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  btnText: {
    color: '#fff',
    fontWeight: '600',
  },
});
