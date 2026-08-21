# Acert CRM

Base inicial do CRM da Acert Agência: painel, clientes, agenda e simulador de portabilidade/refinanciamento.

## Publicação na Hostinger

Este projeto é estático e pode ser publicado diretamente pelo Git Deployment da Hostinger, apontando a pasta de publicação para a raiz do repositório.

## Importante

Nesta primeira etapa, os dados de teste ficam apenas no navegador (`localStorage`). Não cadastre CPF, documentos ou informações reais de clientes até a próxima etapa, que incluirá login, banco de dados seguro e permissões de usuários.

## Fórmulas usadas

- Valor financiado: `parcela atual / coeficiente`
- Liberação estimada: `valor financiado - saldo devedor - margem de segurança`
- Margem opcional: `40% do benefício - parcelas ativas - RMC (5%, se marcada) - RCC (5%, se marcada)`
