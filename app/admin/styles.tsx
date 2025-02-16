import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';

interface MusicStyle {
  id: string;
  name: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminStylesScreen() {
  const [styles, setStyles] = useState<MusicStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStyleName, setNewStyleName] = useState('');
  const [editingStyle, setEditingStyle] = useState<MusicStyle | null>(null);

  useEffect(() => {
    loadStyles();
  }, []);

  const loadStyles = async () => {
    try {
      const stylesSnapshot = await getDocs(query(
        collection(db, 'styles'),
        orderBy('name', 'asc')
      ));

      const stylesList = stylesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
        updatedAt: doc.data().updatedAt.toDate(),
      })) as MusicStyle[];

      setStyles(stylesList);
    } catch (error) {
      console.error('Error loading styles:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newStyleName.trim()) return;

    try {
      const styleDoc = doc(collection(db, 'styles'));
      await setDoc(styleDoc, {
        name: newStyleName.trim(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewStyleName('');
      Alert.alert(i18n.t('admin.styles.success.created'));
      loadStyles();
    } catch (error) {
      console.error('Error creating style:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleUpdate = async (style: MusicStyle) => {
    try {
      await updateDoc(doc(db, 'styles', style.id), {
        name: style.name,
        active: style.active,
        updatedAt: new Date(),
      });

      setEditingStyle(null);
      Alert.alert(i18n.t('admin.styles.success.updated'));
      loadStyles();
    } catch (error) {
      console.error('Error updating style:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleToggleActive = async (style: MusicStyle) => {
    try {
      await updateDoc(doc(db, 'styles', style.id), {
        active: !style.active,
        updatedAt: new Date(),
      });

      Alert.alert(
        style.active
          ? i18n.t('admin.styles.success.deactivated')
          : i18n.t('admin.styles.success.activated')
      );
      loadStyles();
    } catch (error) {
      console.error('Error toggling style:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleDelete = async (style: MusicStyle) => {
    Alert.alert(
      i18n.t('admin.styles.delete.title'),
      i18n.t('admin.styles.delete.message'),
      [
        {
          text: i18n.t('common.button.cancel'),
          style: 'cancel',
        },
        {
          text: i18n.t('common.button.confirm'),
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'styles', style.id), {
                active: false,
                deletedAt: new Date(),
              });

              Alert.alert(i18n.t('admin.styles.success.deleted'));
              loadStyles();
            } catch (error) {
              console.error('Error deleting style:', error);
              Alert.alert(i18n.t('common.error.unknown'));
            }
          },
        },
      ]
    );
  };

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={24} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Ionicons name="musical-notes" size={32} color="#007AFF" />
            <Text style={styles.title}>{i18n.t('admin.styles.title')}</Text>
          </View>
        </View>

        <View style={styles.createForm}>
          <Text style={styles.label}>{i18n.t('admin.styles.form.name')}</Text>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newStyleName}
              onChangeText={setNewStyleName}
              placeholder={i18n.t('admin.styles.form.namePlaceholder')}
            />
            <Button
              title={i18n.t('common.button.create')}
              onPress={handleCreate}
              disabled={!newStyleName.trim()}
            />
          </View>
        </View>

        {styles.map((style) => (
          <View key={style.id} style={styles.styleItem}>
            {editingStyle?.id === style.id ? (
              <View style={styles.editForm}>
                <TextInput
                  style={styles.input}
                  value={editingStyle.name}
                  onChangeText={(text) => setEditingStyle({ ...editingStyle, name: text })}
                />
                <View style={styles.editButtons}>
                  <Button
                    title={i18n.t('common.button.save')}
                    onPress={() => handleUpdate(editingStyle)}
                  />
                  <Button
                    title={i18n.t('common.button.cancel')}
                    onPress={() => setEditingStyle(null)}
                    variant="secondary"
                  />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.styleHeader}>
                  <Text style={styles.styleName}>{style.name}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {style.active
                        ? i18n.t('admin.styles.status.active')
                        : i18n.t('admin.styles.status.inactive')}
                    </Text>
                  </View>
                </View>

                <View style={styles.styleActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => setEditingStyle(style)}
                  >
                    <Ionicons name="create-outline" size={24} color="#007AFF" />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleActive(style)}
                  >
                    <Ionicons
                      name={style.active ? "eye-off-outline" : "eye-outline"}
                      size={24}
                      color={style.active ? "#F44336" : "#4CAF50"}
                    />
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDelete(style)}
                  >
                    <Ionicons name="trash-outline" size={24} color="#F44336" />
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        ))}
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  backButton: {
    padding: 10,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 10,
  },
  createForm: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 16,
    marginBottom: 5,
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 15,
    borderRadius: 8,
    fontSize: 16,
  },
  styleItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  styleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  styleName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  styleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  editForm: {
    gap: 10,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
});