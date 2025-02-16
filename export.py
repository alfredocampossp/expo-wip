import os

# Caminho da pasta de origem e do arquivo de saída
source_dir = r"C:\Users\Dell\Desktop\WIP\temp\bolt-completo\project"
output_file = os.path.join(source_dir, "codigo.txt")

# Extensões de imagem a serem excluídas
image_extensions = {'.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg'}

def read_and_compile_files(source_dir, output_file):
    with open(output_file, 'w', encoding='utf-8') as outfile:
        for root, dirs, files in os.walk(source_dir):
            # Excluir a pasta node_modules
            if 'node_modules' in dirs:
                dirs.remove('node_modules')

            for file in files:
                # Excluir o arquivo package-lock.json e arquivos de imagem
                if file == 'package-lock.json' or os.path.splitext(file)[1] in image_extensions:
                    continue

                file_path = os.path.join(root, file)
                with open(file_path, 'r', encoding='utf-8') as infile:
                    outfile.write(f"--- Conteúdo do arquivo: {file_path} ---\n")
                    outfile.write(infile.read())
                    outfile.write("\n\n")

read_and_compile_files(source_dir, output_file)
