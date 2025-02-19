import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, Alert, TouchableOpacity } from 'react-native';
import { Layout } from '../../src/components/Layout';
import { Button } from '../../src/components/Button';
import { auth, db } from '../../src/services/firebase';
import { collection, query, orderBy, getDocs, doc, setDoc, updateDoc } from 'firebase/firestore';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../../src/i18n';

interface MusicStyle {
  id: string;
  name: string;
  description: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default function AdminStylesScreen() {
  const [styles, setStyles] = useState<MusicStyle[]>([]);
  const [loading, setLoading] = useState(true);
  const [newStyle, setNewStyle] = useState({
    name: '',
    description: '',
  });
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
    if (!newStyle.name.trim()) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      const styleDoc = doc(collection(db, 'styles'));
      await setDoc(styleDoc, {
        name: newStyle.name.trim(),
        description: newStyle.description.trim(),
        active: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      setNewStyle({
        name: '',
        description: '',
      });
      Alert.alert(i18n.t('admin.styles.success.created'));
      loadStyles();
    } catch (error) {
      console.error('Error creating style:', error);
      Alert.alert(i18n.t('common.error.unknown'));
    }
  };

  const handleUpdate = async (style: MusicStyle) => {
    if (!style.name.trim()) {
      Alert.alert(i18n.t('common.error.requiredFields'));
      return;
    }

    try {
      await updateDoc(doc(db, 'styles', style.id), {
        name: style.name,
        description: style.description,
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

  return (
    <Layout>
      <ScrollView style={styles.container}>
        <View style={styles.content}>
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
            <TextInput
              style={styles.input}
              value={newStyle.name}
              onChangeText={(text) => setNewStyle({ ...newStyle, name: text })}
              placeholder={i18n.t('admin.styles.form.namePlaceholder')}
            />

            <Text style={styles.label}>{i18n.t('admin.styles.form.description')}</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={newStyle.description}
              onChangeText={(text) => setNewStyle({ ...newStyle, description: text })}
              placeholder={i18n.t('admin.styles.form.descriptionPlaceholder')}
              multiline
              numberOfLines={2}
            />

            <Button
              title={i18n.t('common.button.create')}
              onPress={handleCreate}
              disabled={!newStyle.name.trim()}
            />
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

                  <TextInput
                    style={[styles.input, styles.textArea]}
                    value={editingStyle.description}
                    onChangeText={(text) => setEditingStyle({ ...editingStyle, description: text })}
                    multiline
                    numberOfLines={2}
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
                    <View style={[
                      styles.statusBadge,
                      style.active ? styles.activeBadge : styles.inactiveBadge
                    ]}>
                      <Text style={[
                        styles.statusText,
                        style.active ? styles.activeText : styles.inactiveText
                      ]}>
                        {style.active
                          ? i18n.t('admin.styles.status.active')
                          : i18n.t('admin.styles.status.inactive')}
                      </Text>
                    </View>
                  </View>

                  {style.description && (
                    <View style={styles.descriptionContainer}>
                      <Ionicons name="information-circle" size={20} color="#666" />
                      <Text style={styles.descriptionText}>{style.description}</Text>
                    </View>
                  )}

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
                  </View>
                </>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </Layout>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
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
    fontSize: 14,
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  styleItem: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
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
    marginBottom: 8,
  },
  styleName: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadge: {
    backgroundColor: '#E8F5E9',
  },
  inactiveBadge: {
    backgroundColor: '#FFEBEE',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  activeText: {
    color: '#4CAF50',
  },
  inactiveText: {
    color: '#F44336',
  },
  descriptionContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f8f9fa',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    gap: 8,
  },
  descriptionText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  styleActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    paddingTop: 12,
  },
  actionButton: {
    padding: 4,
  },
  editForm: {
    gap: 8,
  },
  editButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 4,
  },
});